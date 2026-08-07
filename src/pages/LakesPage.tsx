import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLakes } from '../lib/queries';
import { MapView } from '../components/MapView';
import { SearchIcon, PinIcon, FilterIcon } from '../components/Icons';

export function LakesPage() {
  const { data, loading, error } = useLakes();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [state, setState] = useState('all');
  const [wtype, setWtype] = useState('all');
  const [view, setView] = useState<'both' | 'list'>('both');

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

        <label className="field">
          <FilterIcon />
          <select value={state} onChange={(e) => setState(e.target.value)} aria-label="Filter by state">
            <option value="all">All states</option>
            {states.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>

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

        <div className="toggle" role="group" aria-label="View">
          <button aria-pressed={view === 'both'} onClick={() => setView('both')}>
            Map + list
          </button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
            List only
          </button>
        </div>

        <span className="count">
          {loading ? 'Loading…' : `${filtered.length} water${filtered.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {error && <div className="error">Could not load waters: {error}</div>}

      {view === 'both' && (
        <MapView waters={filtered} onSelect={(slug) => navigate(`/waters/${slug}`)} />
      )}

      {loading && <div className="spinner">Casting a line…</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty">
          {wtype !== 'all' && !(data ?? []).some((l) => l.water_type === wtype)
            ? `No ${wtype.toLowerCase()}s are catalogued yet. Most stock tanks are private, unnamed ranch water, so they have to be added by name rather than imported.`
            : 'No waters match that search. Try a different name, state or type.'}
        </div>
      )}

      <div className="grid">
        {filtered.map((l) => (
          <Link key={l.slug} to={`/waters/${l.slug}`} className="card lake-card">
            <h3>{l.name}</h3>
            <div className="where">
              {l.county ? `${l.county} County, ` : ''}
              {l.state}
            </div>
            <span className="tag tag-state wtype">{l.water_type}</span>
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
