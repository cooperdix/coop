import { useMemo, useState } from 'react';
import { geoAlbersUsa } from 'd3-geo';
import { MAP_WIDTH, MAP_HEIGHT, PROJECTION, STATE_PATHS, STATE_BORDERS } from './usMapPaths';
import type { Lake } from '../lib/types';
import type { Coords } from '../lib/geo';

type Water = Lake & { fishCount?: number; distance?: number };

type Props = {
  waters: Water[];
  onSelect: (slug: string) => void;
  /** Drawn as a distinct marker when the visitor has shared a location. */
  here?: Coords | null;
};

/**
 * Albers USA, matching the projection the state outlines were generated with,
 * so points land where they should. Alaska and Hawaii are inset by the
 * projection itself, which is why remote waters still appear on one screen.
 */
const projection = geoAlbersUsa()
  .translate(PROJECTION.translate as [number, number])
  .scale(PROJECTION.scale);

/** Colour by water type so the map reads as a guide, not just dots. */
const TYPE_COLOR: Record<string, string> = {
  River: '#3d626c',
  Creek: '#3d626c',
  Tailwater: '#2c4a52',
  Bay: '#4a7c8c',
  Sound: '#4a7c8c',
  Estuary: '#4a7c8c',
  Lagoon: '#4a7c8c',
};
const DEFAULT_COLOR = '#a0522d';
const colorFor = (t: string) => TYPE_COLOR[t] ?? DEFAULT_COLOR;

export function MapView({ waters, onSelect, here }: Props) {
  const [hover, setHover] = useState<{ w: Water; x: number; y: number } | null>(null);

  const points = useMemo(
    () =>
      waters
        .map((w) => {
          const p = projection([w.longitude, w.latitude]);
          return p ? { w, x: p[0], y: p[1] } : null;
        })
        .filter((p): p is { w: Water; x: number; y: number } => p !== null),
    [waters],
  );

  const mePoint = useMemo(() => {
    if (!here) return null;
    const p = projection([here.lon, here.lat]);
    return p ? { x: p[0], y: p[1] } : null;
  }, [here]);

  return (
    <div className="map-wrap">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="usmap"
        role="img"
        aria-label={`Map of ${waters.length} fishing waters across the United States`}
      >
        <g className="usmap-land">
          {STATE_PATHS.map((s) => (
            <path key={s.id} d={s.d}>
              <title>{s.name}</title>
            </path>
          ))}
        </g>
        <path className="usmap-borders" d={STATE_BORDERS} />

        {mePoint && (
          <g className="usmap-me" transform={`translate(${mePoint.x},${mePoint.y})`}>
            <circle r="13" className="usmap-me-halo" />
            <circle r="5" />
          </g>
        )}

        <g>
          {points.map(({ w, x, y }) => (
            <circle
              key={w.slug}
              cx={x}
              cy={y}
              r={hover?.w.slug === w.slug ? 7 : 4.5}
              fill={colorFor(w.water_type)}
              className="usmap-pin"
              tabIndex={0}
              role="button"
              aria-label={`${w.name}, ${w.state}`}
              onMouseEnter={() => setHover({ w, x, y })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ w, x, y })}
              onBlur={() => setHover(null)}
              onClick={() => onSelect(w.slug)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(w.slug);
                }
              }}
            />
          ))}
        </g>
      </svg>

      {hover && (
        <div
          className="usmap-tip"
          style={{
            left: `${(hover.x / MAP_WIDTH) * 100}%`,
            top: `${(hover.y / MAP_HEIGHT) * 100}%`,
          }}
        >
          <strong>{hover.w.name}</strong>
          <span>
            {hover.w.water_type} · {hover.w.state}
          </span>
          <span>
            {hover.w.fishCount ?? 0} species
            {hover.w.distance != null && ` · ${Math.round(hover.w.distance)} mi away`}
          </span>
        </div>
      )}
    </div>
  );
}
