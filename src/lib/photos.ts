/**
 * Finding real photographs, in the visitor's browser, from Wikipedia and
 * Wikimedia Commons. Both send permissive CORS headers, so there is no key, no
 * proxy and no build step.
 *
 * Two jobs, with different failure modes.
 *
 * For a fish, an article almost always exists, and the problem is *which*
 * picture: the lead image is as likely to be an underwater shot, a head
 * close-up, a spawning pair or a nineteenth-century plate as it is a clean
 * side-on view of the whole animal. So every image on the page is fetched with
 * its dimensions and scored, and the one that most looks like a whole fish out
 * of water wins.
 *
 * For a water, the picture is usually fine and the problem is *whether one
 * exists*: most of the 586 waters in this guide have no article at all. So when
 * the title lookups come up empty, Commons is searched by coordinate instead,
 * which finds photographs actually taken at that lake or river even when
 * nothing has ever been written about it.
 */

export type Photo = {
  url: string;
  /** Page the image came from, for the credit link. */
  pageUrl: string;
  artist: string | null;
  license: string | null;
};

/** Bumping this invalidates every cached answer. */
const CACHE_VERSION = 4;
const CACHE_PREFIX = `llf.photo.v${CACHE_VERSION}.`;
const CACHE_DAYS = 30;

/**
 * Titles the generic rules get wrong: common names that are ordinary English
 * words, fish filed under another name, and hybrids with no article at all,
 * which should fail immediately rather than spend three requests finding out.
 */
const TITLE_OVERRIDES: Record<string, string | null> = {
  flier: 'Flier (fish)',
  permit: 'Permit (fish)',
  sheefish: 'Nelma',
  greengill: null,
  'meanmouth-bass': null,
  'king-salmon-landlocked': 'Chinook salmon',
  'hybrid-striped-bass': 'Striped bass',
  saugeye: 'Sauger',
  'tiger-muskie': 'Tiger muskellunge',
  cisco: 'Coregonus artedi',
  'butterfly-peacock-bass': 'Cichla ocellaris',
  'clown-knifefish': 'Clown featherback',
};

/** Never a usable photograph, whatever else it scores. */
const REJECT =
  /(\.svg$)|(\.ogv$)|(\.webm$)|(range|distribution|_map|map_|locator|stamp|logo|icon|commons-|wiki|diagram|chart|graph|skeleton|fossil|otolith|scale_bar|barcode|question_book|edit-|padlock|ambox)/i;

type Candidate = {
  url: string;
  pageUrl: string;
  file: string;
  width: number;
  height: number;
  artist: string | null;
  license: string | null;
};

type CacheEntry = { photo: Photo | null; at: number };

function read(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const v = JSON.parse(raw) as CacheEntry;
    if (!v || typeof v.at !== 'number') return null;
    if (Date.now() - v.at > CACHE_DAYS * 864e5) return null;
    return v;
  } catch {
    return null;
  }
}

function write(key: string, photo: Photo | null) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ photo, at: Date.now() }));
  } catch {
    // Full or blocked storage: the lookup simply repeats next visit.
  }
}

export function cachedPhoto(slug: string): Photo | null | undefined {
  const hit = read(slug);
  return hit ? hit.photo : undefined;
}

export function cachedPlacePhoto(slug: string): Photo | null | undefined {
  const hit = read('place.' + slug);
  return hit ? hit.photo : undefined;
}

export function forgetPhoto(slug: string) {
  write(slug, null);
}

/** A grid mounts a hundred cards at once; four connections is plenty. */
const MAX_IN_FLIGHT = 4;
let active = 0;
const waiting: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_IN_FLIGHT) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next();
  else active--;
}

const EN_API = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

const encodeTitle = (t: string) => encodeURIComponent(t.replace(/ /g, '_'));

async function getJson(url: string, signal: AbortSignal): Promise<any | null> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  return res.json();
}

const clean = (v?: string) =>
  v ? v.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || null : null;

/** Turns an API `pages` object of image results into candidates. */
function toCandidates(pages: Record<string, any> | undefined, want: number): Candidate[] {
  if (!pages) return [];
  return Object.values(pages)
    .map((p: any) => {
      const info = p?.imageinfo?.[0];
      if (!info) return null;
      const file = decodeURIComponent(String(p.title ?? '').replace(/^File:/, ''));
      const url: string = info.thumburl ?? info.url;
      if (!url) return null;
      return {
        url,
        pageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeTitle(p.title)}`,
        file,
        width: Number(info.thumbwidth ?? info.width ?? want),
        height: Number(info.thumbheight ?? info.height ?? want),
        artist: clean(info.extmetadata?.Artist?.value),
        license: clean(info.extmetadata?.LicenseShortName?.value),
      } as Candidate;
    })
    .filter((c): c is Candidate => c !== null && !REJECT.test(c.file));
}

/** Every image used on an article, with dimensions, in one request. */
async function imagesOnPage(title: string, want: number, signal: AbortSignal) {
  const url =
    `${EN_API}?action=query&format=json&origin=*&redirects=1&generator=images&gimlimit=24` +
    `&titles=${encodeTitle(title)}&prop=imageinfo` +
    `&iiprop=url|size|extmetadata&iiextmetadatafilter=Artist|LicenseShortName` +
    `&iiurlwidth=${want}`;
  const json = await getJson(url, signal);
  return toCandidates(json?.query?.pages, want);
}

/**
 * How much a candidate looks like the whole fish, out of the water, side on.
 *
 * Shape does most of the work: a fish photographed whole from the side is a
 * wide, shallow rectangle, while head shots, underwater scenes and aquarium
 * glass tend to be square or tall. Filenames supply the rest — anglers and
 * fisheries staff name files remarkably literally.
 */
function scoreFish(c: Candidate, names: string[]): number {
  const f = c.file.toLowerCase().replace(/[_-]+/g, ' ');
  const ratio = c.width / Math.max(1, c.height);
  let score = 0;

  // A whole fish side-on lands near 3:2 and runs out past 3:1 for a pike.
  if (ratio >= 1.25 && ratio <= 3.4) score += 40;
  else if (ratio > 3.4) score += 18;
  else if (ratio >= 1.0) score += 8;
  else score -= 25; // Portrait: usually a person holding it, or a head shot.

  // Out of water, and clearly the whole animal.
  if (/(caught|catch|angler|hand|held|holding|specimen|on ice|measur|weigh|trophy|creel)/.test(f))
    score += 26;
  if (/\b(male|female|adult)\b/.test(f)) score += 6;

  // In the water, or only part of the animal.
  if (/(underwater|in water|swimming|school|shoal|aquarium|tank|reef|habitat)/.test(f)) score -= 30;
  if (/(head|mouth|jaw|teeth|eye|gill|fin detail|scales|closeup|close up|macro)/.test(f))
    score -= 34;
  if (/(egg|larva|fry|juvenile|fingerling|spawn|redd|nest)/.test(f)) score -= 22;
  if (/(cooked|fillet|sushi|dish|market|plate|recipe|smoked|canned)/.test(f)) score -= 40;
  if (/(painting|drawing|illustration|plate|engraving|lithograph|sketch|art)/.test(f)) score -= 45;

  // Named after the fish it shows.
  if (names.some((n) => n && f.includes(n.toLowerCase()))) score += 22;

  // Bigger originals are generally the article's real subject photo.
  if (c.width >= 800) score += 6;

  return score;
}

/** How much a candidate looks like a photograph of this particular water. */
function scorePlace(c: Candidate, name: string): number {
  const f = c.file.toLowerCase().replace(/[_-]+/g, ' ');
  const ratio = c.width / Math.max(1, c.height);
  let score = 0;

  if (ratio >= 1.2) score += 30; // Landscape, as a lake or river should be.
  else if (ratio >= 0.95) score += 8;
  else score -= 12;

  const words = name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (words.length && words.every((w) => f.includes(w))) score += 40;
  else if (words.some((w) => f.includes(w))) score += 20;

  if (/(lake|river|creek|reservoir|pond|bay|shore|water|dam|sunset|aerial|panorama|view)/.test(f))
    score += 14;
  if (/(sign|plaque|marker|portrait|building|bridge construction|graph)/.test(f)) score -= 20;
  if (c.width >= 1000) score += 8;

  return score;
}

const best = (cands: Candidate[], score: (c: Candidate) => number, floor: number): Photo | null => {
  let top: Candidate | null = null;
  let topScore = floor;
  for (const c of cands) {
    const s = score(c);
    if (s > topScore) {
      topScore = s;
      top = c;
    }
  }
  return top
    ? { url: top.url, pageUrl: top.pageUrl, artist: top.artist, license: top.license }
    : null;
};

export type LookupInput = {
  slug: string;
  commonName: string;
  scientificName?: string | null;
  want: number;
};

/**
 * A photograph of the fish: whole, and out of the water where one exists.
 *
 * Throws only when the network itself failed, which is deliberately not cached
 * so someone who was offline once gets another try later.
 */
export async function findPhoto(
  { slug, commonName, scientificName, want }: LookupInput,
  signal: AbortSignal,
): Promise<Photo | null> {
  const hit = read(slug);
  if (hit) return hit.photo;

  let titles: string[];
  if (slug in TITLE_OVERRIDES) {
    const forced = TITLE_OVERRIDES[slug];
    if (forced === null) {
      write(slug, null);
      return null;
    }
    titles = [forced];
  } else {
    // Scientific name is unambiguous and redirects. Then the common name in
    // Wikipedia's own sentence case, since only a title's first letter is
    // case-insensitive and "Largemouth Bass" would miss.
    const sentence = commonName.charAt(0).toUpperCase() + commonName.slice(1).toLowerCase();
    titles = [...new Set([scientificName, sentence, commonName].filter(Boolean))] as string[];
  }

  const names = [commonName, scientificName ?? '', commonName.split(' ').slice(-1)[0]];

  await acquire();
  try {
    for (const t of titles) {
      const cands = await imagesOnPage(t, want, signal);
      if (!cands.length) continue;
      // The floor keeps a page of maps and plates from yielding a bad photo
      // just because something had to win.
      const found = best(cands, (c) => scoreFish(c, names), 0);
      if (found) {
        write(slug, found);
        return found;
      }
    }
    write(slug, null);
    return null;
  } finally {
    release();
  }
}

/** Images on Commons taken within a radius of a point, nearest first. */
async function nearbyImages(
  lat: number,
  lon: number,
  radiusM: number,
  want: number,
  signal: AbortSignal,
) {
  const url =
    `${COMMONS_API}?action=query&format=json&origin=*&generator=geosearch` +
    `&ggscoord=${lat}|${lon}&ggsradius=${radiusM}&ggslimit=30&ggsnamespace=6` +
    `&prop=imageinfo&iiprop=url|size|extmetadata` +
    `&iiextmetadatafilter=Artist|LicenseShortName&iiurlwidth=${want}`;
  const json = await getJson(url, signal);
  return toCandidates(json?.query?.pages, want);
}

export type PlaceInput = {
  slug: string;
  name: string;
  state: string;
  waterType: string;
  latitude?: number | null;
  longitude?: number | null;
};

/**
 * A photograph of the water.
 *
 * Articles first, then — for the great majority of waters that have none —
 * Commons by coordinate, widening the search until something turns up. A
 * photograph taken half a mile from a reservoir is still a photograph of that
 * reservoir far more often than not, and it is the only way a small lake gets
 * a real picture rather than a placeholder.
 */
export async function findPlacePhoto(
  place: PlaceInput,
  signal: AbortSignal,
  want = 900,
): Promise<Photo | null> {
  const key = 'place.' + place.slug;
  const hit = read(key);
  if (hit) return hit.photo;

  const { name, state, waterType, latitude, longitude } = place;
  const titles = [...new Set([`${name} (${state})`, name, `${name}, ${state}`])];

  await acquire();
  try {
    for (const t of titles) {
      const cands = await imagesOnPage(t, want, signal);
      const found = best(cands, (c) => scorePlace(c, name), 10);
      if (found) {
        write(key, found);
        return found;
      }
    }

    if (latitude != null && longitude != null) {
      // A river is a line, not a point, so the radius has to open up a long
      // way before giving up on moving water.
      const radii = /river|creek|tailwater/i.test(waterType)
        ? [3000, 10000, 20000]
        : [2000, 6000, 15000];
      for (const r of radii) {
        const cands = await nearbyImages(latitude, longitude, r, want, signal);
        if (!cands.length) continue;
        // Scored, but with a low floor: at this point any real photograph of
        // the right place beats an empty frame.
        const found = best(cands, (c) => scorePlace(c, name), -10);
        if (found) {
          write(key, found);
          return found;
        }
      }
    }

    write(key, null);
    return null;
  } finally {
    release();
  }
}
