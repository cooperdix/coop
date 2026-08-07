import { BrowserRouter, NavLink, Route, Routes, Link } from 'react-router-dom';
import { LakesPage } from './pages/LakesPage';
import { LakeDetailPage } from './pages/LakeDetailPage';
import { SpeciesPage } from './pages/SpeciesPage';
import { SpeciesDetailPage } from './pages/SpeciesDetailPage';
import { BrandMark } from './components/Icons';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="masthead">
          <div className="masthead-inner">
            <Link to="/" className="brand">
              <BrandMark className="brand-mark" />
              <span className="brand-text">
                <span className="brand-name">Little Lake Fishing</span>
                <span className="brand-sub">Waters &amp; species of the USA</span>
              </span>
            </Link>
            <nav className="nav">
              <NavLink to="/" end>
                Waters
              </NavLink>
              <NavLink to="/species">Species</NavLink>
            </nav>
          </div>
        </header>

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
          A curated guide to notable US fishing waters. Species lists are a reference, not a
          substitute for current state regulations — always check your state wildlife agency for
          licences, seasons and limits before you fish.
        </footer>
      </div>
    </BrowserRouter>
  );
}
