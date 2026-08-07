import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpeciesList } from '../lib/queries';
import { FishIllustration } from '../components/FishIllustration';
import { SearchIcon, FilterIcon } from '../components/Icons';

export function SpeciesPage() {
  const { data, loading, error } = useSpeciesList();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const categories = useMemo(
    () => [...new Set((data ?? []).map((s) => s.category).filter(Boolean))].sort() as string[],
    [data],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (!needle) return true;
      return (
        s.common_name.toLowerCase().includes(needle) ||
        (s.scientific_name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [data, q, cat]);

  return (
    <>
      <div className="page-head">
        <h1>Fish Species</h1>
        <p>
          Know what you want to catch? Start here. Every species lists the lakes in this guide
          where you can find it, plus how and when to target it.
        </p>
      </div>

      <div className="controls">
        <label className="field">
          <SearchIcon />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search species"
            aria-label="Search species"
          />
        </label>

        <label className="field">
          <FilterIcon />
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by group">
            <option value="all">All groups</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <span className="count">
          {loading ? 'Loading…' : `${filtered.length} species`}
        </span>
      </div>

      {error && <div className="error">Could not load species: {error}</div>}
      {loading && <div className="spinner">Sorting the tackle box…</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty">No species match that search.</div>
      )}

      <div className="grid">
        {filtered.map((s) => (
          <Link key={s.slug} to={`/species/${s.slug}`} className="card species-card">
            <FishIllustration illustration={s.illustration} size={150} className="art" />
            <h3>{s.common_name}</h3>
            {s.scientific_name && <div className="sci">{s.scientific_name}</div>}
            <div className="n">
              {s.lakeCount > 0
                ? `${s.lakeCount} lake${s.lakeCount === 1 ? '' : 's'} in this guide`
                : 'No catalogued lakes yet'}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
