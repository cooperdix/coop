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
  const [view, setView] = useState<'both' | 'list'>('both');

  const states = useMemo(() => {
    const seen = new Map<string, string>();
    (data ?? []).forEach((l) => seen.set(l.state_code, l.state));
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((l) => {
      if (state !== 'all' && l.state_code !== state) return false;
      if (!needle) return true;
      return (
        l.name.toLowerCase().includes(needle) ||
        l.state.toLowerCase().includes(needle) ||
        (l.county ?? '').toLowerCase().includes(needle)
      );
    });
  }, [data, q, state]);

  return (
    <>
      <div className="page-head">
        <h1>Lakes of the United States</h1>
        <p>
          A curated guide to notable fishing lakes in all fifty states. Pick one to see exactly
          what you can catch there, how to catch it, and what the access looks like.
        </p>
      </div>

      <div className="controls">
        <label className="field">
          <SearchIcon />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lakes, counties, states"
            aria-label="Search lakes"
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

        <div className="toggle" role="group" aria-label="View">
          <button aria-pressed={view === 'both'} onClick={() => setView('both')}>
            Map + list
          </button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
            List only
          </button>
        </div>

        <span className="count">
          {loading ? 'Loading…' : `${filtered.length} lake${filtered.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {error && <div className="error">Could not load lakes: {error}</div>}

      {view === 'both' && (
        <MapView lakes={filtered} onSelect={(slug) => navigate(`/lakes/${slug}`)} />
      )}

      {loading && <div className="spinner">Casting a line…</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty">No lakes match that search. Try a different name or state.</div>
      )}

      <div className="grid">
        {filtered.map((l) => (
          <Link key={l.slug} to={`/lakes/${l.slug}`} className="card lake-card">
            <h3>{l.name}</h3>
            <div className="where">
              {l.county ? `${l.county} County, ` : ''}
              {l.state}
            </div>
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
