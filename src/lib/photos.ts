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
  'king-salmon-landlocked': 'Chinook salmon',
  'hybrid-striped-bass': 'Striped bass',
  saugeye: 'Sauger',
  'tiger-muskie': 'Tiger muskellunge',
  cisco: 'Coregonus artedi',
  'butterfly-peacock-bass': 'Cichla ocellaris',
  'clown-knifefish': 'Clown featherback',

  // The meanmouth is a documented hybrid with its own article. It was
  // previously set to give up without asking, which guaranteed the drawing.
  'meanmouth-bass': 'Meanmouth bass',

  // "Spanish mackerel" is the genus, and its page is full of other species.
  // The fish caught off the American coast is the Atlantic one.
  'spanish-mackerel': 'Atlantic Spanish mackerel',

  // Both catfish resolve fine by name, but the scientific article is the one
  // that reliably carries a photograph of the fish rather than of a dam or a
  // fisheries worker.
  'blue-catfish': 'Ictalurus furcatus',
  'flathead-catfish': 'Pylodictis olivaris',

  // Trout and char, pinned to the taxonomic article for each species.
  //
  // Common-name pages are the worst offenders in the whole guide: several are
  // about a fishery or a stocking programme rather than the animal, and the
  // pictures on them are of rivers, hatcheries and people. The species article
  // is the one with a photograph of the fish.
  'rainbow-trout': 'Oncorhynchus mykiss',
  'brown-trout': 'Salmo trutta',
  'brook-trout': 'Salvelinus fontinalis',
  'lake-trout': 'Salvelinus namaycush',
  'cutthroat-trout': 'Oncorhynchus clarkii',
  'bull-trout': 'Salvelinus confluentus',
  'golden-trout': 'Oncorhynchus aguabonita',
  'gila-trout': 'Oncorhynchus gilae',
  'apache-trout': 'Oncorhynchus apache',
  'dolly-varden': 'Salvelinus malma',
  'arctic-char': 'Salvelinus alpinus',
  'lake-whitefish': 'Coregonus clupeaformis',
  'mountain-whitefish': 'Prosopium williamsoni',
  'arctic-grayling': 'Thymallus arcticus',
  // Both are hatchery crosses with their own short articles; the scientific
  // name is a formula rather than a title, so these have to be named directly.
  'tiger-trout': 'Tiger trout',
  splake: 'Splake',
};

/**
 * A photograph is a JPEG. Charts, maps, diagrams, logos and interface
 * furniture on Wikipedia are almost universally SVG or PNG, so requiring a
 * photographic container throws all of them out in one move, before any
 * scoring runs. The cost is the occasional PNG photograph; the benefit is that
 * a graph can never win, whatever it happens to be called.
 */
const PHOTO_FILE = /\.jpe?g$/i;

/** Never a usable photograph, whatever else it scores. */
const REJECT =
  /(range|distribution|_map|map_|locator|stamp|logo|icon|commons-|wiki|diagram|chart|graph|plot|histogram|timeline|landings|catch data|stock assessment|phylogen|cladogram|taxonom|anatomy|schematic|skeleton|fossil|otolith|scale_bar|barcode|question_book|edit-|padlock|ambox|flag_of|seal_of|coat_of_arms|signature)/i;

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
    .filter((c): c is Candidate => c !== null && PHOTO_FILE.test(c.file) && !REJECT.test(c.file));
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
 * The strings that identify this species and no other.
 *
 * The genus alone is useless here — Thunnus obesus and Thunnus albacares share
 * it, and a bigeye article carries pictures of both — so matching is on the
 * species epithet or on the full common name. Short epithets are dropped,
 * since something like "keta" appears inside unrelated words; the binomial and
 * the common name still cover those fish.
 */
function nameKeys(commonName: string, scientificName?: string | null): string[] {
  const keys: string[] = [];
  const common = commonName.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (common) keys.push(common);

  // Hybrid names are a formula rather than a binomial, so there is no epithet.
  if (scientificName && !/\sx\s/i.test(scientificName)) {
    const parts = scientificName.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      keys.push(`${parts[0]} ${parts[1]}`);
      if (parts[1].length >= 5) keys.push(parts[1]);
    }
  }
  return keys;
}

/** Filenames use every separator there is; compare on plain words. */
const normalise = (file: string) =>
  file.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * How much a candidate looks like the whole fish, out of the water, side on.
 *
 * Shape does most of the work: a fish photographed whole from the side is a
 * wide, shallow rectangle, while head shots, underwater scenes and aquarium
 * glass tend to be square or tall. Filenames supply the rest — anglers and
 * fisheries staff name files remarkably literally.
 */
function scoreFish(c: Candidate, keys: string[]): number {
  const f = normalise(c.file);
  const ratio = c.width / Math.max(1, c.height);
  let score = 0;

  // The photograph has to be of this fish. Rewarding a name match but not
  // requiring one let a picture of a different species on the same article
  // win on shape alone, which is how a yellowfin ended up labelled bigeye.
  if (!keys.some((k) => k && f.includes(k))) return -1000;

  // A whole fish side-on lands near 3:2 and runs out past 3:1 for a pike.
  if (ratio >= 1.25 && ratio <= 3.4) score += 40;
  else if (ratio > 3.4) score += 18;
  else if (ratio >= 1.0) score += 12;
  // Portrait is only mildly against it: a big catfish or muskie held up for
  // the camera is a tall photograph, and it is still the whole fish out of
  // the water, which is the thing being looked for.
  else score -= 8;

  // Out of water, and clearly the whole animal.
  if (/(caught|catch|angler|hand|held|holding|specimen|on ice|measur|weigh|trophy|creel)/.test(f))
    score += 34;
  if (/\b(male|female|adult)\b/.test(f)) score += 6;

  // In the water, or only part of the animal.
  if (/(underwater|in water|swimming|school|shoal|aquarium|tank|reef|habitat)/.test(f)) score -= 30;
  if (/(head|mouth|jaw|teeth|eye|gill|fin detail|scales|closeup|close up|macro)/.test(f))
    score -= 34;
  if (/(egg|larva|fry|juvenile|fingerling|spawn|redd|nest)/.test(f)) score -= 22;
  // Food, not fish. A cooked, filleted or plated fish is never the picture
  // wanted here, so this is a rejection rather than a penalty it could
  // outscore on a page with nothing better.
  if (
    /(cook|fried|grill|bake|roast|fillet|filet|steak|sushi|sashimi|dish|meal|dinner|plate|platter|recipe|smoked|canned|tinned|market|fishmonger|restaurant|butcher|gutted|cleaned|salted|dried)/.test(
      f,
    )
  )
    return -1000;
  // Trout articles in particular are full of scenery and hatchery plumbing.
  if (/(river|creek|stream|lake|reservoir|hatchery|pond bank|valley|falls|dam|landscape)/.test(f))
    score -= 28;
  if (/(painting|drawing|illustration|plate|engraving|lithograph|sketch|art)/.test(f)) score -= 45;

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

/**
 * Files on Commons whose name or description matches a search term.
 *
 * Requiring a photograph to name its species is what makes the picture
 * trustworthy, but on its own it would cost coverage: plenty of articles
 * illustrate a fish with a file named after the photographer or the river.
 * Searching Commons directly recovers those, and does it with the species name
 * as the query, so what comes back is already the right fish.
 */
async function searchCommons(query: string, want: number, signal: AbortSignal) {
  const url =
    `${COMMONS_API}?action=query&format=json&origin=*&generator=search` +
    `&gsrnamespace=6&gsrlimit=24&gsrsearch=${encodeURIComponent(query)}` +
    `&prop=imageinfo&iiprop=url|size|extmetadata` +
    `&iiextmetadatafilter=Artist|LicenseShortName&iiurlwidth=${want}`;
  const json = await getJson(url, signal);
  return toCandidates(json?.query?.pages, want);
}

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

  const keys = nameKeys(commonName, scientificName);

  await acquire();
  try {
    for (const t of titles) {
      const cands = await imagesOnPage(t, want, signal);
      if (!cands.length) continue;
      // The floor keeps a page of maps and plates from yielding a bad photo
      // just because something had to win.
      const found = best(cands, (c) => scoreFish(c, keys), -12);
      if (found) {
        write(slug, found);
        return found;
      }
    }

    // Nothing on the article named this fish. Ask Commons directly, which is
    // where the well-labelled specimen photographs live.
    for (const q of [scientificName, commonName].filter(Boolean) as string[]) {
      const cands = await searchCommons(q, want, signal);
      const found = best(cands, (c) => scoreFish(c, keys), -12);
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
