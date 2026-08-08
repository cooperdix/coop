import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import { LakesPage } from './pages/LakesPage';
import { LakeDetailPage } from './pages/LakeDetailPage';
import { SpeciesPage } from './pages/SpeciesPage';
import { SpeciesDetailPage } from './pages/SpeciesDetailPage';
import { BrandMark } from './components/Icons';
import { WaterBackground } from './components/WaterBackground';
import { SplashScreen } from './components/SplashScreen';

/**
 * Every item here goes somewhere real: the filtered views are the waters page
 * with its type held in the URL, so a link from the bar and a link copied out
 * of the address bar land on exactly the same thing.
 */
const NAV = [
  { to: '/', label: 'Waters', end: true },
  { to: '/?type=Lake', label: 'Lakes' },
  { to: '/?type=River', label: 'Rivers' },
  { to: '/?type=Reservoir', label: 'Reservoirs' },
  { to: '/?type=Tailwater', label: 'Tailwaters' },
  { to: '/?type=Pond', label: 'Ponds' },
  { to: '/species', label: 'Species' },
];

function Masthead() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  // Any navigation closes the sheet, including a back button press.
  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="masthead">
      <div className="masthead-inner">
        <Link to="/" className="brand" aria-label="Little Lake Fishing, home">
          <BrandMark className="brand-mark" />
          <span className="brand-text">
            <span className="brand-name">Little Lake Fishing</span>
          </span>
        </Link>

        <nav className="nav" id="site-nav" data-open={open} aria-label="Sections">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              // NavLink compares pathnames only, so the filtered links would all
              // light up together on the waters page. The query string decides.
              className={({ isActive }) =>
                isActive && location.search === item.to.replace(/^[^?]*/, '') ? 'active' : ''
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
        </button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WaterBackground />
      <SplashScreen />
      <div className="app">
        <Masthead />

        <main className="main">
          <Routes>
            <Route path="/" element={<LakesPage />} />
            <Route path="/waters/:slug" element={<LakeDetailPage />} />
            <Route path="/species" element={<SpeciesPage />} />
            <Route path="/species/:slug" element={<SpeciesDetailPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  That page is not on the map. <Link to="/">Back to the waters</Link>.
                </div>
              }
            />
          </Routes>
        </main>

        <footer className="footer">
          A guide to notable US fishing waters. Species lists are a reference, not a substitute for
          current state regulations — always check your state wildlife agency for licences, seasons
          and limits before you fish.
        </footer>
      </div>
    </BrowserRouter>
  );
}
