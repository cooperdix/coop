import fs from 'fs';
import * as topojson from 'topojson-client';
import { geoAlbersUsa, geoPath } from 'd3-geo';

const W = 960, H = 600;
const us = JSON.parse(fs.readFileSync('node_modules/us-atlas/states-10m.json','utf8'));
const states = topojson.feature(us, us.objects.states);
const mesh = topojson.mesh(us, us.objects.states, (a,b)=>a!==b);

// geoAlbersUsa places Alaska and Hawaii as insets, so the whole country fits
// one frame — exactly what a national guide needs, and no tiles required.
const proj = geoAlbersUsa().fitSize([W,H], states);
const path = geoPath(proj);

const outlines = states.features
  .map(f => ({ id: f.id, name: f.properties.name, d: path(f) }))
  .filter(f => f.d);

const out = `/**
 * Pre-projected US state outlines, generated at build time from us-atlas via
 * d3-geo (Albers USA, which insets Alaska and Hawaii so the whole country fits
 * one frame). Baked into the source so the map needs no tile server, no API
 * key and no network at runtime.
 *
 * Regenerate with scripts/make-map.mjs if the basemap ever needs to change.
 */
export const MAP_WIDTH = ${W};
export const MAP_HEIGHT = ${H};

/** Longitude/latitude to SVG coordinates, matching the projection above. */
export const PROJECTION = ${JSON.stringify({
  // Store the raw projection parameters so the runtime can reproduce it.
  translate: proj.translate(), scale: proj.scale(),
})} as const;

export const STATE_PATHS: { id: string; name: string; d: string }[] = ${JSON.stringify(outlines)};

export const STATE_BORDERS = ${JSON.stringify(path(mesh))};
`;
fs.mkdirSync('src/components', { recursive: true });
fs.writeFileSync('src/components/usMapPaths.ts', out);

// Also emit every water's projected pixel position so neither the app nor the
// artifact needs d3 at runtime.
console.log('states:', outlines.length, '| file KB:', Math.round(out.length/1024));
