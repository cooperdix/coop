import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpeciesList } from '../lib/queries';
import { FishPhoto } from '../components/FishPhoto';
import { SearchIcon, FilterIcon, PinIcon } from '../components/Icons';
import { useGeo, distanceMiles } from '../lib/geo';

export function SpeciesPage() {
  const { data, loading, error } = useSpeciesList();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [radius, setRadius] = useState(100);
  const geo = useGeo();
  const here = geo.state.status === 'ready' ? geo.state.coords : null;

  const categories = useMemo(
    () => [...new Set((data ?? []).map((s) => s.category).filter(Boolean))].sort() as string[],
    [data],
  );

  /**
   * With a location shared, a species only appears if it is actually caught in
   * a water inside the radius, and the count reflects those waters rather than
   * the national total. Nothing is hidden without a location.
   */
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? [])
      .map((s) => {
        if (!here) return { ...s, nearCount: null as number | null, nearest: null as number | null };
        const d = s.waters.map((w) =>
          distanceMiles(here, { lat: w.latitude, lon: w.longitude }),
        );
        const within = d.filter((x) => x <= radius);
        return {
          ...s,
          nearCount: within.length,
          nearest: d.length ? Math.min(...d) : null,
        };
      })
      .filter((s) => {
        if (cat !== 'all' && s.category !== cat) return false;
        if (here && !s.nearCount) return false;
        if (!needle) return true;
        return (
          s.common_name.toLowerCase().includes(needle) ||
          (s.scientific_name ?? '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) =>
        here ? (b.nearCount ?? 0) - (a.nearCount ?? 0) : a.common_name.localeCompare(b.common_name),
      );
  }, [data, q, cat, here, radius]);

  return (
    <>
      <div className="page-head">
        <h1>Fish Species</h1>
        <p>
          Know what you want to catch? Start here. Every species lists the waters in this guide
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

        <span className="count">
          {loading ? 'Loading…' : `${filtered.length} species${here ? ' near you' : ''}`}
        </span>
      </div>

      {error && <div className="error">Could not load species: {error}</div>}

      {here && (
        <div className="notice notice-ok">
          Showing only species caught within {radius} miles of you.{' '}
          <button className="linkish" onClick={geo.clear}>
            Show every species
          </button>
        </div>
      )}
      {geo.state.status === 'denied' && (
        <div className="notice">
          Location is blocked for this site, so every species is shown. Allow location in your
          browser&rsquo;s address bar to narrow this to your area.
        </div>
      )}
      {loading && <div className="spinner">Sorting the tackle box…</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty">
          {here
            ? `No species are recorded within ${radius} miles. Try a wider radius.`
            : 'No species match that search.'}
        </div>
      )}

      <div className="grid">
        {filtered.map((s) => (
          <Link key={s.slug} to={`/species/${s.slug}`} className="card species-card">
            <FishPhoto
              slug={s.slug}
              commonName={s.common_name}
              scientificName={s.scientific_name}
              illustration={s.illustration}
              size={150}
              className="art"
            />
            <h3>{s.common_name}</h3>
            {s.scientific_name && <div className="sci">{s.scientific_name}</div>}
            <div className="n">
              {here && s.nearCount != null
                ? `${s.nearCount} water${s.nearCount === 1 ? '' : 's'} near you`
                : s.lakeCount > 0
                  ? `${s.lakeCount} water${s.lakeCount === 1 ? '' : 's'} in this guide`
                  : 'No catalogued waters yet'}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
