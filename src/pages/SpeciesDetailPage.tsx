import { Link, useParams } from 'react-router-dom';
import { useSpecies } from '../lib/queries';
import { FishIllustration } from '../components/FishIllustration';
import { ChevronLeft } from '../components/Icons';

export function SpeciesDetailPage() {
  const { slug } = useParams();
  const { data, loading, error } = useSpecies(slug);

  if (loading) return <div className="spinner">Loading species…</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const { species, lakes } = data;

  const facts = [
    { k: 'How to catch it', v: species.bait_and_lures },
    { k: 'Best season', v: species.best_season },
    { k: 'Best time of day', v: species.best_time },
    { k: 'Typical size', v: species.typical_size },
    { k: 'Record', v: species.record_size },
  ].filter((f) => f.v);

  // Group the lakes by state so the list reads like a gazetteer.
  const byState = lakes.reduce<Record<string, typeof lakes>>((acc, l) => {
    (acc[l.state] ??= []).push(l);
    return acc;
  }, {});

  return (
    <>
      <Link to="/species" className="crumb">
        <ChevronLeft size={14} /> All species
      </Link>

      <div className="card detail-head">
        <FishIllustration illustration={species.illustration} size={210} />
        <div style={{ flex: '1 1 320px' }}>
          <h1>{species.common_name}</h1>
          <div className="sub">
            <em>{species.scientific_name}</em>
            {species.family ? ` · ${species.family}` : ''}
          </div>
          {species.description && <p className="lede">{species.description}</p>}
        </div>
      </div>

      <div className="two-col">
        <div>
          <section className="card panel">
            <h2>Field notes</h2>
            {species.identification && (
              <div className="info-row">
                <div className="k">Identification</div>
                <div className="v">{species.identification}</div>
              </div>
            )}
            {facts.map((f) => (
              <div className="info-row" key={f.k}>
                <div className="k">{f.k}</div>
                <div className="v">{f.v}</div>
              </div>
            ))}
          </section>
        </div>

        <div>
          <section className="card panel">
            <h2>Where to catch it</h2>
            {lakes.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: '0.9rem' }}>
                No water in this guide currently lists this species. The catalogue covers notable
                waters rather than every water in the country, so this fish may well be present
                elsewhere in its range.
              </p>
            ) : (
              <>
                <p style={{ marginTop: '-0.4rem', color: 'var(--ink-2)', fontSize: '0.9rem' }}>
                  Found in <strong>{lakes.length}</strong> water{lakes.length === 1 ? '' : 's'}{' '}
                  across <strong>{Object.keys(byState).length}</strong> state
                  {Object.keys(byState).length === 1 ? '' : 's'}.
                </p>
                {Object.entries(byState).map(([state, group]) => (
                  <div className="state-group" key={state}>
                    <h3>{state}</h3>
                    <div className="lake-list">
                      {group.map((l) => (
                        <Link key={l.slug} to={`/waters/${l.slug}`} className="lake-row">
                          <span className="nm">{l.name}</span>
                          {l.county && <span className="st">{l.county} County</span>}
                          {l.abundance === 'Abundant' && (
                            <span className="tag tag-abundant ab">Abundant</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
