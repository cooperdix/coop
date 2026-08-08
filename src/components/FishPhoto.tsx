import { useEffect, useState } from 'react';
import { FishIllustration } from './FishIllustration';
import { cachedPhoto, findPhoto, forgetPhoto, type Photo } from '../lib/photos';

type Props = {
  slug: string;
  commonName: string;
  scientificName?: string | null;
  illustration: string | null | undefined;
  /** Rendered width in CSS pixels. The box is 3:2. */
  size?: number;
  className?: string;
  /** The one photo above the fold on a detail page loads eagerly. */
  priority?: boolean;
  /** Credit is shown on the detail page, where there is room for it. */
  showCredit?: boolean;
};

export function FishPhoto({
  slug,
  commonName,
  scientificName,
  illustration,
  size = 120,
  className,
  priority = false,
  showCredit = false,
}: Props) {
  // A cached answer is used on the first render, so a revisit paints the photo
  // immediately instead of flashing the drawing.
  const seeded = cachedPhoto(slug);
  const [photo, setPhoto] = useState<Photo | null>(seeded ?? null);
  const [settled, setSettled] = useState(seeded !== undefined);
  const [loaded, setLoaded] = useState(false);

  const height = Math.round((size * 2) / 3);

  useEffect(() => {
    if (cachedPhoto(slug) !== undefined) return;
    const ctrl = new AbortController();
    let live = true;

    // Ask for roughly twice the drawn width so the image is sharp on a retina
    // screen without pulling a full-resolution original into a small card.
    const want = Math.min(1024, Math.max(320, Math.round(size * 2)));

    findPhoto({ slug, commonName, scientificName, want }, ctrl.signal)
      .then((found) => {
        if (!live) return;
        setPhoto(found);
        setSettled(true);
      })
      .catch(() => {
        // Offline or blocked. Not cached, so a later visit tries again.
        if (live && !ctrl.signal.aborted) setSettled(true);
      });

    return () => {
      live = false;
      ctrl.abort();
    };
  }, [slug, commonName, scientificName, size]);

  const figureClass = [
    'fish-figure',
    showCredit ? 'fish-figure-detail' : null,
    !settled ? 'fish-figure-loading' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <figure className={figureClass} style={{ width: size, height }}>
        {photo ? (
          <img
            src={photo.url}
            alt={`Photograph of a ${commonName.toLowerCase()}`}
            className="fish-photo"
            data-loaded={loaded}
            width={size}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'low'}
            onLoad={() => setLoaded(true)}
            // A moved or deleted file falls back to the drawing rather than a
            // broken image, and drops the cache entry that pointed at it.
            onError={() => {
              forgetPhoto(slug);
              setPhoto(null);
            }}
          />
        ) : (
          <span className="fish-fallback">
            <FishIllustration illustration={illustration} size={Math.round(size * 0.86)} />
          </span>
        )}
      </figure>

      {showCredit && photo && (photo.artist || photo.license) && (
        <small className="fish-credit">
          Photo:{' '}
          <a href={photo.pageUrl} target="_blank" rel="noopener noreferrer">
            Wikipedia
          </a>
          {photo.artist ? ` · ${photo.artist}` : ''}
          {photo.license ? ` · ${photo.license}` : ''}
        </small>
      )}
    </div>
  );
}
