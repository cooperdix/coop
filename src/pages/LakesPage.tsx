import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLakes } from '../lib/queries';
import { MapView } from '../components/MapView';
import { SearchIcon, PinIcon, FilterIcon } from '../components/Icons';
import { useGeo, distanceMiles, formatMiles } from '../lib/geo';
import { StateSelect } from '../components/StateSelect';

export function LakesPage() {
  const { data, loading, error } = useLakes();
  const navigate = useNavigate();
  // The bar links straight into a filtered view, so the URL owns the water
  // type rather than component state — a shared link lands on the same page.
  const [params, setParams] = useSearchParams();
  const wtype = params.get('type') ?? 'all';
  const setWtype = (t: string) => {
    const next = new URLSearchParams(params);
    if (t === 'all') next.delete('type');
    else next.set('type', t);
    setParams(next, { replace: true });
  };

  const [q, setQ] = useState('');
  const [state, setState] = useState('all');
  const [view, setView] = useState<'both' | 'list'>('both');
  const [radius, setRadius] = useState(100);
  const geo = useGeo();
  const here = geo.state.status === 'ready' ? geo.state.coords : null;

  const states = useMemo(() => {
    const seen = new Map<string, string>();
    (data ?? []).forEach((l) => seen.set(l.state_code, l.state));
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  /**
   * Every kind of water the guide can hold, whether or not anything is
   * catalogued under it yet. Listing them all keeps the filter honest about
   * the guide's scope rather than only about what happens to be seeded.
   */
  const CANONICAL_TYPES = [
    'Lake', 'Reservoir', 'River', 'Creek', 'Tailwater', 'Pond', 'Tank',
    'Flowage', 'Chain', 'Bay', 'Sound', 'Estuary', 'Lagoon',
  ];

  const types = useMemo(() => {
    const seen = new Set((data ?? []).map((l) => l.water_type));
    return [
      ...CANONICAL_TYPES.filter((t) => seen.has(t)),
      ...CANONICAL_TYPES.filter((t) => !seen.has(t)),
      ...[...seen].filter((t) => !CANONICAL_TYPES.includes(t)).sort(),
    ];
  }, [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((l) => {
      if (state !== 'all' && l.state_code !== state) return false;
      if (wtype !== 'all' && l.water_type !== wtype) return false;
      if (!needle) return true;
      return (
        l.name.toLowerCase().includes(needle) ||
        l.state.toLowerCase().includes(needle) ||
        (l.county ?? '').toLowerCase().includes(needle)
      );
    });
  }, [data, q, state, wtype]);

  /**
   * With a location shared, waters carry their distance and the list is
   * ordered nearest-first and trimmed to the chosen radius. Without one it
   * stays the full alphabetical guide, so the page works either way.
   */
  const shown = useMemo(() => {
    if (!here) return filtered;
    return filtered
      .map((w) => ({ ...w, distance: distanceMiles(here, { lat: w.latitude, lon: w.longitude }) }))
      .filter((w) => w.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [filtered, here, radius]);

  return (
    <>
      <div className="page-head">
        <h1>Waters of the United States</h1>
        <p>
          A curated guide to notable fishing waters in all fifty states — lakes, rivers,
          tailwaters, bays and sounds. Pick one to see what you can catch there, how to catch it,
          and what the access looks like.
        </p>
      </div>

      <div className="controls">
        <label className="field">
          <SearchIcon />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search waters, counties, states"
            aria-label="Search waters"
          />
        </label>

        <StateSelect
          value={state}
          onChange={setState}
          options={states.map(([code, name]) => ({
            code,
            name,
            count: (data ?? []).filter((l) => l.state_code === code).length,
          }))}
        />

        <label className="field">
          <FilterIcon />
          <select value={wtype} onChange={(e) => setWtype(e.target.value)} aria-label="Filter by water type">
            <option value="all">All water types</option>
            {types.map((t) => {
              const n = (data ?? []).filter((l) => l.water_type === t).length;
              return (
                <option key={t} value={t}>
                  {t}
                  {n ? ` (${n})` : ' — none yet'}
                </option>
              );
            })}
          </select>
        </label>

        {here ? (
          <label className="field">
            <PinIcon />
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              aria-label="Search radius"
            >
              {[25, 50, 100, 250, 500].map((r) => (
                <option key={r} value={r}>
                  Within {r} miles
                </option>
              ))}
            </select>
          </label>
        ) : (
          <button
            className="near-btn"
            onClick={geo.locate}
            disabled={geo.state.status === 'locating'}
          >
            <PinIcon size={14} />
            {geo.state.status === 'locating' ? 'Finding you…' : 'Near me'}
          </button>
        )}

        <div className="toggle" role="group" aria-label="View">
          <button aria-pressed={view === 'both'} onClick={() => setView('both')}>
            Map + list
          </button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
            List only
          </button>
        </div>

        <span className="count">
          {loading ? 'Loading…' : `${shown.length} water${shown.length === 1 ? '' : 's'}${here ? ' near you' : ''}`}
        </span>
      </div>

      {error && <div className="error">Could not load waters: {error}</div>}

      {geo.state.status === 'denied' && (
        <div className="notice">
          Location is blocked for this site, so the full guide is shown instead. Allow location in
          your browser&rsquo;s address bar to see the waters closest to you.
        </div>
      )}
      {geo.state.status === 'unavailable' && (
        <div className="notice">{geo.state.message} Showing the full guide meanwhile.</div>
      )}
      {here && (
        <div className="notice notice-ok">
          Showing waters within {radius} miles of you, nearest first.{' '}
          <button className="linkish" onClick={geo.clear}>
            Show the whole country
          </button>
        </div>
      )}

      {view === 'both' && (
        <MapView waters={shown} onSelect={(slug) => navigate(`/waters/${slug}`)} here={here} />
      )}

      {loading && <div className="spinner">Casting a line…</div>}

      {!loading && !error && shown.length === 0 && (
        <div className="empty">
          {here && filtered.length > 0
            ? `No waters within ${radius} miles. Try a wider radius.`
            : wtype !== 'all' && !(data ?? []).some((l) => l.water_type === wtype)
            ? `No ${wtype.toLowerCase()}s are catalogued yet. Most stock tanks are private, unnamed ranch water, so they have to be added by name rather than imported.`
            : 'No waters match that search. Try a different name, state or type.'}
        </div>
      )}

      <div className="grid">
        {shown.map((l) => (
          <Link key={l.slug} to={`/waters/${l.slug}`} className="card lake-card">
            <h3>{l.name}</h3>
            <div className="where">
              {l.county ? `${l.county} County, ` : ''}
              {l.state}
            </div>
            <span className="wtags">
              <span className="tag tag-state">{l.water_type}</span>
              {'distance' in l && typeof l.distance === 'number' && (
                <span className="tag tag-near">{formatMiles(l.distance)} away</span>
              )}
            </span>
            {l.description && <p className="blurb">{l.description}</p>}
            <div className="fish-row">
              <PinIcon size={14} />
              {l.fishCount} species recorded
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
