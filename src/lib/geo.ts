import { useCallback, useEffect, useState } from 'react';

export type Coords = { lat: number; lon: number };

const STORAGE_KEY = 'llf.coords';
const MEAN_EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles. Accurate enough for "how far is that lake". */
export function distanceMiles(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * MEAN_EARTH_RADIUS_MILES * Math.asin(Math.sqrt(s));
}

export type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; coords: Coords }
  | { status: 'denied' }
  | { status: 'unavailable'; message: string };

/**
 * Browser geolocation, asked for only when the user opts in.
 *
 * The last fix is remembered so returning visitors are not re-prompted, and
 * every failure path resolves to a state the UI can explain rather than a
 * silent hang.
 */
export function useGeo() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState({ status: 'ready', coords: JSON.parse(saved) as Coords });
    } catch {
      // Private browsing or blocked storage: just ask again when needed.
    }
  }, []);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', message: 'This browser cannot share a location.' });
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
        } catch {
          // Not fatal; the fix just will not survive a reload.
        }
        setState({ status: 'ready', coords });
      },
      (err) => {
        setState(
          err.code === err.PERMISSION_DENIED
            ? { status: 'denied' }
            : { status: 'unavailable', message: 'Could not get a location fix. Try again.' },
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
    setState({ status: 'idle' });
  }, []);

  return { state, locate, clear };
}

export const formatMiles = (m: number) =>
  m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m).toLocaleString()} mi`;
