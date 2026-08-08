import { useEffect, useState } from 'react';
import { FishIllustration } from './FishIllustration';

/**
 * A real photograph of the fish, with the drawing as the fallback.
 *
 * Photographs are not stored in the database. They are looked up in the
 * visitor's browser from Wikipedia's REST summary endpoint, which serves the
 * lead image of an article and sends `Access-Control-Allow-Origin: *`, so it
 * can be called directly from the page without a proxy or an API key.
 *
 * Scientific name is tried first because it is unambiguous and redirects to the
 * article; the common name is the second attempt. Hybrids and a handful of
 * regional fish have no article at all, and those keep the hand-drawn plate,
 * which is why the drawings stay in the build rather than being deleted.
 *
 * Every answer, including "there is no photo", is cached in localStorage, so a
 * species costs at most one request per browser and the grid does not re-fetch
 * on every render.
 */

const CACHE_PREFIX = 'llf.photo.';
/** Long enough that the lookup is effectively one-time, short enough to heal. */
const CACHE_DAYS = 30;

type Cached = { url: string | null; at: number };

function readCache(slug: string): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + slug);
    if (!raw) return null;
    const v = JSON.parse(raw) as Cached;
    if (Date.now() - v.at > CACHE_DAYS * 864e5) return null;
    return v;
  } catch {
    return null;
  }
}

function writeCache(slug: string, url: string | null) {
  try {
    localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify({ url, at: Date.now() }));
  } catch {
    // Storage full or blocked: the lookup just repeats next visit.
  }
}

/** Asks Wikipedia for one title. Resolves to an image URL, or null. */
async function lookup(title: string, signal: AbortSignal): Promise<string | null> {
  const url =
    'https://en.wikipedia.org/api/rest_v1/page/summary/' +
    encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    type?: string;
    thumbnail?: { source?: string };
    originalimage?: { source?: string; width?: number };
  };
  // Disambiguation pages carry a generic icon rather than a photo of a fish.
  if (json.type === 'disambiguation') return null;
  const thumb = json.thumbnail?.source;
  if (!thumb) return null;
  // The thumbnail URL encodes its own width; ask for a larger render of the
  // same file so the detail page is not upscaling a 320px crop.
  return thumb.replace(/\/(\d+)px-/, (m, w) => (Number(w) < 640 ? '/640px-' : m));
}

type Props = {
  slug: string;
  commonName: string;
  scientificName?: string | null;
  illustration: string | null | undefined;
  /** Rendered width in pixels. The drawing keeps its 2:1 box; photos are 3:2. */
  size?: number;
  className?: string;
};

export function FishPhoto({
  slug,
  commonName,
  scientificName,
  illustration,
  size = 120,
  className,
}: Props) {
  const cached = readCache(slug);
  const [url, setUrl] = useState<string | null>(cached?.url ?? null);
  const [settled, setSettled] = useState(cached != null);

  useEffect(() => {
    if (readCache(slug) != null) return;
    const ctrl = new AbortController();
    let live = true;

    (async () => {
      // Wikipedia titles articles in sentence case ("Largemouth bass"), and
      // only the first letter is case-insensitive, so the stored title-cased
      // name has to be lowered before it will resolve.
      const sentence = commonName.charAt(0).toUpperCase() + commonName.slice(1).toLowerCase();
      const titles = [...new Set([scientificName, sentence, commonName].filter(Boolean))] as string[];
      for (const t of titles) {
        try {
          const found = await lookup(t, ctrl.signal);
          if (!live) return;
          if (found) {
            writeCache(slug, found);
            setUrl(found);
            setSettled(true);
            return;
          }
        } catch {
          if (ctrl.signal.aborted) return;
          // Offline or blocked: fall through to the drawing without caching a
          // miss, so a later visit on a working connection tries again.
          if (!live) return;
          setSettled(true);
          return;
        }
      }
      if (!live) return;
      writeCache(slug, null);
      setSettled(true);
    })();

    return () => {
      live = false;
      ctrl.abort();
    };
  }, [slug, commonName, scientificName]);

  if (url) {
    return (
      <img
        src={url}
        alt={`Photograph of a ${commonName.toLowerCase()}`}
        className={['fish-photo', className].filter(Boolean).join(' ')}
        width={size}
        height={Math.round((size * 2) / 3)}
        loading="lazy"
        decoding="async"
        // A dead or moved file falls back to the drawing rather than a broken
        // image icon, and clears the cache entry that pointed at it.
        onError={() => {
          writeCache(slug, null);
          setUrl(null);
        }}
      />
    );
  }

  return (
    <FishIllustration
      illustration={illustration}
      size={size}
      className={[className, settled ? undefined : 'fish-art-loading'].filter(Boolean).join(' ')}
    />
  );
}
