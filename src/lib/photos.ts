/**
 * Finding a real photograph of a fish.
 *
 * Photos are not stored in the database. They are resolved in the visitor's
 * browser from Wikipedia, whose REST endpoints send a permissive CORS header,
 * so there is no key, no proxy and no build step involved.
 *
 * The work here is mostly about the ways a naive lookup gets it wrong:
 *
 *  1. article titles are sentence case, so the stored title-cased common name
 *     has to be lowered before it resolves;
 *  2. some fish need an explicit title, because their common name is a English
 *     word ("Flier", "Permit") that leads somewhere else entirely;
 *  3. a lead image is often not a photograph — range maps, line drawings, and
 *     old plates are common, and are rejected by filename;
 *  4. the summary thumbnail is a small crop, so the full-size file is asked for
 *     at a width matched to where it will be drawn;
 *  5. a species with no article at all must fail fast and stay failed;
 *  6. licences on these files require attribution, which means fetching the
 *     file's metadata and showing the credit;
 *  7. a grid of a hundred species must not open a hundred connections at once;
 *  8. answers are cached, misses included, and the cache is versioned so a bad
 *     entry can be invalidated by shipping code rather than by asking people to
 *     clear their browser.
 */

export type Photo = {
  url: string;
  /** Page the image came from, for the credit link. */
  pageUrl: string;
  artist: string | null;
  license: string | null;
};

/** Bumping this invalidates every cached answer. */
const CACHE_VERSION = 3;
const CACHE_PREFIX = `llf.photo.v${CACHE_VERSION}.`;
const CACHE_DAYS = 30;

/**
 * Titles that the generic rules get wrong. Common names that are ordinary
 * English words, fish whose article sits under a different name, and hybrids
 * that have no article at all and should not waste three requests finding out.
 */
const TITLE_OVERRIDES: Record<string, string | null> = {
  flier: 'Flier (fish)',
  permit: 'Permit (fish)',
  mooneye: 'Mooneye',
  goldeye: 'Goldeye',
  sheefish: 'Nelma',
  greengill: null,
  'meanmouth-bass': null,
  'king-salmon-landlocked': 'Chinook salmon',
  'hybrid-striped-bass': 'Striped bass',
  saugeye: 'Sauger',
  splake: 'Splake',
  'tiger-muskie': 'Tiger muskellunge',
  'tiger-trout': 'Tiger trout',
  warmouth: 'Warmouth',
  burbot: 'Burbot',
  cisco: 'Coregonus artedi',
  'butterfly-peacock-bass': 'Cichla ocellaris',
  'clown-knifefish': 'Clown featherback',
  'alabama-bass': 'Alabama bass',
  'northern-snakehead': 'Northern snakehead',
};

/**
 * A lead image is not automatically a photograph. Range maps and old
 * lithographic plates are extremely common on fish articles and look wrong
 * beside real photos, so they are rejected on the filename.
 */
const NOT_A_PHOTO =
  /(\.svg$)|(range|distribution|map|locator|stamp|logo|icon|diagram|chart|drawing|illustration|plate|sketch|painting|engraving|skeleton|fossil|otolith|scale_bar)/i;

type CacheEntry = { photo: Photo | null; at: number };

function read(slug: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + slug);
    if (!raw) return null;
    const v = JSON.parse(raw) as CacheEntry;
    if (!v || typeof v.at !== 'number') return null;
    if (Date.now() - v.at > CACHE_DAYS * 864e5) return null;
    return v;
  } catch {
    return null;
  }
}

function write(slug: string, photo: Photo | null) {
  try {
    localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify({ photo, at: Date.now() }));
  } catch {
    // Full or blocked storage: the lookup simply repeats next visit.
  }
}

/** Cached answer if there is one, so a card can render a photo on first paint. */
export function cachedPhoto(slug: string): Photo | null | undefined {
  const hit = read(slug);
  return hit ? hit.photo : undefined;
}

/**
 * At most a few lookups in flight at once. A species grid mounts a hundred
 * cards in one frame, and a hundred simultaneous requests is both slower
 * overall and rude to a free API.
 */
const MAX_IN_FLIGHT = 4;
let active = 0;
const queue: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_IN_FLIGHT) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release() {
  const next = queue.shift();
  if (next) next();
  else active--;
}

const REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const API = 'https://en.wikipedia.org/w/api.php';

const encodeTitle = (t: string) => encodeURIComponent(t.replace(/ /g, '_'));

async function getJson(url: string, signal: AbortSignal): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

/** Widens a thumbnail URL to the width it will actually be drawn at. */
function atWidth(thumb: string, want: number): string {
  return thumb.replace(/\/(\d+)px-/, (m, w) => (Number(w) < want ? `/${want}px-` : m));
}

/**
 * The credit. Wikipedia's `imageinfo` carries the artist and licence for the
 * underlying file, which most of these licences require be shown.
 */
async function credit(
  title: string,
  signal: AbortSignal,
): Promise<{ artist: string | null; license: string | null }> {
  const url =
    `${API}?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata` +
    `&iiextmetadatafilter=Artist|LicenseShortName&titles=${encodeTitle(title)}`;
  try {
    const json = await getJson(url, signal);
    const pages = (json?.query as { pages?: Record<string, unknown> } | undefined)?.pages ?? {};
    const first = Object.values(pages)[0] as
      | { imageinfo?: { extmetadata?: Record<string, { value?: string }> }[] }
      | undefined;
    const meta = first?.imageinfo?.[0]?.extmetadata;
    const strip = (v?: string) =>
      v ? v.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || null : null;
    return {
      artist: strip(meta?.Artist?.value),
      license: strip(meta?.LicenseShortName?.value),
    };
  } catch {
    return { artist: null, license: null };
  }
}

/** Asks one title. Resolves to a photo, or null when there is nothing usable. */
async function tryTitle(title: string, want: number, signal: AbortSignal): Promise<Photo | null> {
  const json = await getJson(REST + encodeTitle(title), signal);
  if (!json) return null;
  if (json.type === 'disambiguation') return null;

  const thumb = (json.thumbnail as { source?: string } | undefined)?.source;
  const original = (json.originalimage as { source?: string } | undefined)?.source;
  const source = thumb ?? original;
  if (!source) return null;
  if (NOT_A_PHOTO.test(decodeURIComponent(source))) return null;

  const pageUrl =
    ((json.content_urls as { desktop?: { page?: string } } | undefined)?.desktop?.page as string) ??
    `https://en.wikipedia.org/wiki/${encodeTitle(title)}`;

  // The filename, which is what imageinfo is keyed on.
  const file = decodeURIComponent((original ?? source).split('/').pop() ?? '');
  const { artist, license } = file
    ? await credit(`File:${file}`, signal)
    : { artist: null, license: null };

  return { url: atWidth(source, want), pageUrl, artist, license };
}

export type LookupInput = {
  slug: string;
  commonName: string;
  scientificName?: string | null;
  /** Roughly the pixel width the photo will be drawn at. */
  want: number;
};

/**
 * Resolves a photograph, or null when the fish genuinely has none.
 *
 * Throws only if the network itself failed, which is deliberately not cached —
 * a visitor who was offline once should get another try later.
 */
export async function findPhoto(
  { slug, commonName, scientificName, want }: LookupInput,
  signal: AbortSignal,
): Promise<Photo | null> {
  const hit = read(slug);
  if (hit) return hit.photo;

  if (slug in TITLE_OVERRIDES) {
    const forced = TITLE_OVERRIDES[slug];
    if (forced === null) {
      write(slug, null);
      return null;
    }
    await acquire();
    try {
      const found = await tryTitle(forced, want, signal);
      write(slug, found);
      return found;
    } finally {
      release();
    }
  }

  // Scientific name first: unambiguous, and it redirects to the article.
  // Then the common name in Wikipedia's own sentence case, then as stored.
  const sentence = commonName.charAt(0).toUpperCase() + commonName.slice(1).toLowerCase();
  const titles = [...new Set([scientificName, sentence, commonName].filter(Boolean))] as string[];

  await acquire();
  try {
    for (const t of titles) {
      const found = await tryTitle(t, want, signal);
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

/** Clears a cached answer, used when an image URL turns out to be dead. */
export function forgetPhoto(slug: string) {
  try {
    localStorage.removeItem(CACHE_PREFIX + slug);
  } catch {
    // Nothing to do.
  }
  write(slug, null);
}

/**
 * A photograph of a place rather than a fish.
 *
 * Waters are messier than species: many share a name with a town, and the
 * small ones have no article at all. The candidates go from most specific to
 * least, and a miss is cached like any other so an unphotographed farm pond
 * costs one round of requests ever.
 */
export async function findPlacePhoto(
  place: { slug: string; name: string; state: string; waterType: string },
  signal: AbortSignal,
  want = 900,
): Promise<Photo | null> {
  const hit = read('place.' + place.slug);
  if (hit) return hit.photo;

  const { name, state, waterType } = place;
  const candidates = [
    `${name} (${state})`,
    name,
    `${name} (${waterType.toLowerCase()})`,
    `${name}, ${state}`,
  ];

  await acquire();
  try {
    for (const t of [...new Set(candidates)]) {
      const found = await tryTitle(t, want, signal);
      // A page that exists but is about a town or a dam will still usually
      // carry a usable photograph of the water, so no further filtering here
      // beyond the shared not-a-photograph rule.
      if (found) {
        write('place.' + place.slug, found);
        return found;
      }
    }
    write('place.' + place.slug, null);
    return null;
  } finally {
    release();
  }
}

/** Cached place answer, if any. */
export function cachedPlacePhoto(slug: string): Photo | null | undefined {
  const hit = read('place.' + slug);
  return hit ? hit.photo : undefined;
}
