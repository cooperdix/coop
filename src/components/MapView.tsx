import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '../lib/supabase';
import type { Feature, Point } from 'geojson';
import type { Lake } from '../lib/types';

type Props = {
  lakes: (Lake & { fishCount?: number })[];
  /** Called with a lake slug when a pin is clicked. */
  onSelect: (slug: string) => void;
};

type LakeFeature = Feature<
  Point,
  { slug: string; name: string; where: string; fish: number; cluster_id: number }
>;

/** mapbox-gl's own feature type does not expose geometry/properties to TypeScript. */
const asFeature = (f: unknown): LakeFeature | undefined => f as LakeFeature | undefined;

/** Opening view: the whole country, Alaska and Hawaii included. */
const US_BOUNDS: [number, number, number, number] = [-170, 17, -64, 66];

/**
 * Hard pan limit, a little looser than the opening view so lakes near the edge
 * (Hawaii, the Alaska interior, northern Maine) can still be centred comfortably.
 */
const US_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-175, 12],
  [-58, 72],
];

/** Zoomed out past this the US stops filling the frame, so don't allow it. */
const MIN_ZOOM = 2.2;

export function MapView({ lakes, onSelect }: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  // Kept in a ref so the click handler always sees the current callback.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!MAPBOX_TOKEN || !container.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const m = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      bounds: US_BOUNDS,
      fitBoundsOptions: { padding: 30 },
      // Keep the map on the United States: no panning off to other continents,
      // no zooming out to a world view, and no repeating globe either side.
      maxBounds: US_MAX_BOUNDS,
      minZoom: MIN_ZOOM,
      renderWorldCopies: false,
      cooperativeGestures: true,
    });
    map.current = m;

    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    m.on('load', () => {
      m.addSource('lakes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 8,
      });

      // Clustered groups.
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'lakes',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#2f4530',
          'circle-opacity': 0.9,
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 30, 26],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#f6f0e2',
        },
      });
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'lakes',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: { 'text-color': '#f6f0e2' },
      });

      // Individual lakes.
      m.addLayer({
        id: 'lake-points',
        type: 'circle',
        source: 'lakes',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#a0522d',
          'circle-radius': 7,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#fdfaf1',
        },
      });

      const popup = new mapboxgl.Popup({
        closeButton: false,
        offset: 14,
        maxWidth: '240px',
      });

      m.on('mouseenter', 'lake-points', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        const f = asFeature(e.features?.[0]);
        if (!f || f.geometry.type !== 'Point') return;
        const p = f.properties;
        popup
          .setLngLat(f.geometry.coordinates as [number, number])
          .setHTML(
            `<div class="popup-name">${p.name}</div>` +
              `<div class="popup-meta">${p.where}</div>` +
              `<div class="popup-link">${p.fish} species &rarr;</div>`,
          )
          .addTo(m);
      });
      m.on('mouseleave', 'lake-points', () => {
        m.getCanvas().style.cursor = '';
        popup.remove();
      });

      m.on('click', 'lake-points', (e) => {
        const slug = asFeature(e.features?.[0])?.properties?.slug;
        if (typeof slug === 'string') onSelectRef.current(slug);
      });

      // Clicking a cluster zooms into it.
      m.on('click', 'clusters', (e) => {
        const f = asFeature(e.features?.[0]);
        if (!f || f.geometry.type !== 'Point') return;
        const src = m.getSource('lakes') as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(f.properties.cluster_id, (err, zoom) => {
          if (err || zoom == null) return;
          m.easeTo({ center: f.geometry.coordinates as [number, number], zoom });
        });
      });
      m.on('mouseenter', 'clusters', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'clusters', () => (m.getCanvas().style.cursor = ''));
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Push the (possibly filtered) lake list into the map source.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const push = () => {
      const src = m.getSource('lakes') as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData({
        type: 'FeatureCollection',
        features: lakes.map((l) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [l.longitude, l.latitude] },
          properties: {
            slug: l.slug,
            name: l.name,
            where: `${l.county ? l.county + ' County, ' : ''}${l.state}`,
            fish: l.fishCount ?? 0,
          },
        })),
      });
    };

    if (m.isStyleLoaded()) push();
    else m.once('load', push);
  }, [lakes]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="map-wrap">
        <div className="map-missing">
          <div>
            <strong>Map needs a Mapbox token.</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
              Add <code>VITE_MAPBOX_TOKEN</code> to your environment variables, then redeploy.
              The lake list below works without it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <div className="map-wrap" ref={container} />;
}
