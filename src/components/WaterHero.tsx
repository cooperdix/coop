import { useEffect, useMemo, useState } from 'react';
import { geoAlbersUsa } from 'd3-geo';
import { MAP_WIDTH, MAP_HEIGHT, PROJECTION, STATE_PATHS, STATE_BORDERS } from './usMapPaths';
import { cachedPlacePhoto, findPlacePhoto, type Photo } from '../lib/photos';
import type { Lake } from '../lib/types';

const projection = geoAlbersUsa()
  .translate(PROJECTION.translate as [number, number])
  .scale(PROJECTION.scale);

/**
 * A photograph of the water and a locator map, side by side at the head of a
 * water page.
 *
 * The photograph is looked up the same way the fish ones are, and most small
 * waters simply do not have one — so the empty state is designed rather than
 * treated as an error. The map always works, because it is drawn from the
 * coordinates already in the database rather than fetched from anywhere.
 */
export function WaterHero({ water }: { water: Lake }) {
  const seeded = cachedPlacePhoto(water.slug);
  const [photo, setPhoto] = useState<Photo | null>(seeded ?? null);
  const [settled, setSettled] = useState(seeded !== undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (cachedPlacePhoto(water.slug) !== undefined) return;
    const ctrl = new AbortController();
    let live = true;

    findPlacePhoto(
      {
        slug: water.slug,
        name: water.name,
        state: water.state,
        waterType: water.water_type,
        latitude: water.latitude,
        longitude: water.longitude,
      },
      ctrl.signal,
    )
      .then((found) => {
        if (!live) return;
        setPhoto(found);
        setSettled(true);
      })
      .catch(() => {
        if (live && !ctrl.signal.aborted) setSettled(true);
      });

    return () => {
      live = false;
      ctrl.abort();
    };
  }, [water.slug, water.name, water.state, water.water_type, water.latitude, water.longitude]);

  const point = useMemo(() => {
    if (water.latitude == null || water.longitude == null) return null;
    return projection([water.longitude, water.latitude]);
  }, [water.latitude, water.longitude]);

  // The home state is filled differently so the locator reads at a glance
  // instead of asking the reader to find one dot on a continent.
  const homeId = useMemo(
    () => STATE_PATHS.find((s) => s.name === water.state)?.id ?? null,
    [water.state],
  );

  return (
    <div className="water-hero">
      <figure className="water-shot">
        {photo ? (
          <>
            <img
              src={photo.url}
              alt={`Photograph of ${water.name}, ${water.state}`}
              data-loaded={loaded}
              loading="eager"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setPhoto(null)}
            />
            <figcaption>
              <a href={photo.pageUrl} target="_blank" rel="noopener noreferrer">
                Wikimedia
              </a>
              {photo.artist ? ` · ${photo.artist}` : ''}
              {photo.license ? ` · ${photo.license}` : ''}
            </figcaption>
          </>
        ) : (
          <div className="water-shot-empty">
            {settled
              ? `No public photograph of ${water.name} yet.`
              : `Looking for a photograph of ${water.name}…`}
          </div>
        )}
      </figure>

      <div className="locator">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="img"
          aria-label={`Map showing the location of ${water.name} in ${water.state}`}
        >
          <g className="locator-land">
            {STATE_PATHS.map((s) => (
              <path
                key={s.id}
                d={s.d}
                className={s.id === homeId ? 'locator-home' : undefined}
              />
            ))}
          </g>
          <path className="locator-borders" d={STATE_BORDERS} />
          {point && (
            <g>
              <circle className="locator-ring" cx={point[0]} cy={point[1]} r="11" />
              <circle className="locator-dot" cx={point[0]} cy={point[1]} r="5" />
            </g>
          )}
        </svg>
        <div className="locator-label">
          {point
            ? `${water.latitude.toFixed(3)}°, ${water.longitude.toFixed(3)}° · ${water.state}`
            : water.state}
        </div>
      </div>
    </div>
  );
}
