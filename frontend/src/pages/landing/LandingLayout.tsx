import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard, Menu, X } from 'lucide-react';
import { getAppSettings, subscribeAppSettings } from '../../components/appSettingsBus';
import { MALL_LOCATION } from './mallData';
import ChatWidget from '../../components/ChatWidget';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/events', label: 'Event', end: false },
  { to: '/tenant-directory', label: 'Tenant', end: false },
  { to: '/facilities', label: 'Facilities', end: false },
  { to: '/location', label: 'Location', end: false },
];

function LandingLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = Boolean(localStorage.getItem('token') && localStorage.getItem('user'));
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);

  const overHero = pathname === '/' && !scrolled;

  const fullWidthFooter =
    pathname.startsWith('/tenant-directory') ||
    pathname.startsWith('/facilities') ||
    pathname.startsWith('/location') ||
    pathname.startsWith('/events');

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setBlurred(window.scrollY > 170);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`landing-shell ${fullWidthFooter ? 'footer-full' : ''}`}>
      <div ref={sentinelRef} className="landing-nav-sentinel" />
      <nav
        className={`landing-navbar ${overHero ? 'over-hero' : 'nav-scrolled'} ${
          overHero && blurred ? 'blurred' : ''
        }`}
      >
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand" onClick={() => setMenuOpen(false)}>
            <span className="landing-brand-logo">
              {brand.appLogo ? (
                <img src={brand.appLogo} alt={brand.appName} className="sidebar-logo-img" />
              ) : (
                <Building2 size={18} />
              )}
            </span>
            {brand.ready && brand.brandMode === 'name' && brand.appName && (
              <span className="landing-brand-name">{brand.appName}</span>
            )}
          </Link>
          <div className="landing-nav-links">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `landing-nav-link ${isActive ? 'active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="landing-nav-cta">
            {isLoggedIn ? (
              <NavLink to="/dashboard" className="btn-primary btn-nav-cta">
                <LayoutDashboard size={15} />
                <span>Go to Dashboard</span>
              </NavLink>
            ) : (
              <NavLink to="/login" className="btn-primary btn-nav-cta">
                Sign In
              </NavLink>
            )}
            <button
              className="landing-nav-burger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <div className={`landing-mobile-menu ${menuOpen ? 'open' : ''}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `landing-mobile-link ${isActive ? 'active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="landing-main">
        <Outlet />
      </main>

      <ChatWidget />

      <footer className={`landing-footer ${fullWidthFooter ? 'footer-full' : ''}`}>
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="landing-brand">
              <span className="landing-brand-logo">
                {brand.appLogo ? (
                  <img src={brand.appLogo} alt={brand.appName} className="sidebar-logo-img" />
                ) : (
                  <Building2 size={18} />
                )}
              </span>
              {brand.ready && brand.brandMode === 'name' && brand.appName && (
                <span className="landing-brand-name">{brand.appName}</span>
              )}
            </Link>
            <p className="footer-tagline">
              Mall Management Information System — a single gateway for tenants,
              facilities, and building operations.
            </p>
          </div>

          <div className="footer-col">
            <h4>Navigation</h4>
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="footer-col">
            <h4>Visit</h4>
            <span>{brand.appAddress || MALL_LOCATION.address}</span>
            <span>Monday – Sunday, 09.00 – 22.30</span>
            <span>leasing@simmall.id</span>
          </div>

          <div className="footer-col">
            <h4>Operators</h4>
            <Link to="/login">Dashboard Login</Link>
            <span>System usage guide</span>
            <span>Status: Operational</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 {brand.ready ? brand.appName : ''}. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingLayout;
