import { Link, useParams } from 'react-router-dom';
import { useLake } from '../lib/queries';
import { FishIllustration } from '../components/FishIllustration';
import { ChevronLeft, ChevronRight } from '../components/Icons';

const nf = new Intl.NumberFormat('en-US');

export function LakeDetailPage() {
  const { slug } = useParams();
  const { data, loading, error } = useLake(slug);

  if (loading) return <div className="spinner">Loading water…</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const { lake, species } = data;
  const abundant = species.filter((s) => s.abundance === 'Abundant');

  const stats = [
    lake.surface_acres && { k: 'Surface area', v: `${nf.format(lake.surface_acres)} acres` },
    lake.max_depth_ft && { k: 'Max depth', v: `${nf.format(lake.max_depth_ft)} ft` },
    lake.elevation_ft != null && { k: 'Elevation', v: `${nf.format(lake.elevation_ft)} ft` },
    { k: 'Species', v: String(species.length) },
  ].filter(Boolean) as { k: string; v: string }[];

  const access = [
    { k: 'Getting there', v: lake.access_notes },
    { k: 'Boat ramps', v: lake.boat_ramps },
    { k: 'Shore access', v: lake.shore_access },
    { k: 'Marinas', v: lake.marinas },
    { k: 'Camping', v: lake.camping },
  ].filter((r) => r.v);

  return (
    <>
      <Link to="/" className="crumb">
        <ChevronLeft size={14} /> All waters
      </Link>

      <div className="card detail-head">
        <div style={{ flex: '1 1 340px' }}>
          <h1>{lake.name}</h1>
          <div className="sub">
            {lake.water_type} &middot; {lake.county ? `${lake.county} County, ` : ''}
            {lake.state}
          </div>
          {lake.description && <p className="lede">{lake.description}</p>}
          <div className="stats">
            {stats.map((s) => (
              <div className="stat" key={s.k}>
                <div className="k">{s.k}</div>
                <div className="v">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <section className="card panel">
            <h2>What you can catch here</h2>
            {abundant.length > 0 && (
              <p style={{ marginTop: '-0.35rem', color: 'var(--ink-2)', fontSize: '0.9rem' }}>
                Best known for{' '}
                <strong>
                  {abundant
                    .slice(0, 3)
                    .map((s) => s.common_name.toLowerCase())
                    .join(', ')}
                </strong>
                .
              </p>
            )}
            <div className="fish-list">
              {species.map((s) => (
                <Link key={s.slug} to={`/species/${s.slug}`} className="fish-item">
                  <FishIllustration illustration={s.illustration} size={64} className="art" />
                  <div style={{ minWidth: 0 }}>
                    <div className="nm">{s.common_name}</div>
                    {s.scientific_name && <div className="sci">{s.scientific_name}</div>}
                  </div>
                  {s.abundance === 'Abundant' && (
                    <span className="tag tag-abundant" style={{ marginLeft: '0.5rem' }}>
                      Abundant
                    </span>
                  )}
                  <ChevronRight className="go" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div>
          {access.length > 0 && (
            <section className="card panel">
              <h2>Access &amp; facilities</h2>
              {access.map((r) => (
                <div className="info-row" key={r.k}>
                  <div className="k">{r.k}</div>
                  <div className="v">{r.v}</div>
                </div>
              ))}
              {lake.facilities.length > 0 && (
                <div className="info-row">
                  <div className="k">On site</div>
                  <div className="facilities">
                    {lake.facilities.map((f) => (
                      <span className="tag" key={f}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
