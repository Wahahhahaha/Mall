import { useRef, useEffect, useSyncExternalStore, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, ClipboardList, LogOut, Store, Wallet, Menu } from 'lucide-react';
import { getAppSettings, subscribeAppSettings } from '../../components/appSettingsBus';
import type { UserInfo } from '../../types';

function readUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
}

export default function TenantLayout() {
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);
  const navigate = useNavigate();
  const user = readUser();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileBoxRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setProfileMenuOpen(true), 120);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setProfileMenuOpen(false), 260);
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (profileBoxRef.current && !profileBoxRef.current.contains(e.target as Node)) {
        clearTimers();
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      clearTimers();
    };
  }, []);

  const handleLogout = () => {
    clearTimers();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleChipClick = () => {
    if (profileMenuOpen) {
      clearTimers();
      setProfileMenuOpen(false);
    } else {
      clearTimers();
      setProfileMenuOpen(true);
    }
  };

  const linkClass = (isActive: boolean) =>
    `tenant-nav-link ${isActive ? 'active' : ''}`;

  return (
    <div className="tenant-shell">
      <header className="tenant-navbar">
        <div className="tenant-nav-inner">
          <div className="parkir-nav-left">
            <div className="parkir-brand">
              <div className="parkir-brand-logo">
                {brand.appLogo ? (
                  <img src={brand.appLogo} alt={brand.appName} />
                ) : (
                  <Building2 size={24} />
                )}
              </div>
              {brand.ready && brand.brandMode === 'name' && brand.appName && (
                <span className="parkir-brand-name">{brand.appName}</span>
              )}
            </div>
          </div>

          <nav className={`tenant-nav-links ${mobileOpen ? 'open' : ''}`}>
            <NavLink to="/tenant" end className={({ isActive }) => linkClass(isActive)}>
              <Store size={15} /> Browse Units
            </NavLink>
            <NavLink to="/tenant/requests" className={({ isActive }) => linkClass(isActive)}>
              <ClipboardList size={15} /> My Requests
            </NavLink>
            <NavLink to="/tenant/costs" className={({ isActive }) => linkClass(isActive)}>
              <Wallet size={15} /> Costs & Contract
            </NavLink>
          </nav>

          <div
            ref={profileBoxRef}
            className={`parkir-profile ${profileMenuOpen ? 'open' : ''}`}
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              className="parkir-user-chip"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              onClick={handleChipClick}
            >
              <span className="parkir-avatar">{(user?.email ?? '?').substring(0, 1).toUpperCase()}</span>
              <span className="parkir-user-mail">{user?.email ?? 'tenant'}</span>
              <ChevronDown size={13} className={`parkir-chip-chevron ${profileMenuOpen ? 'open' : ''}`} />
            </button>

            {profileMenuOpen && (
              <div className="parkir-profile-menu" role="menu">
                <div className="parkir-profile-head">
                  <span className="parkir-avatar large">{(user?.email ?? '?').substring(0, 1).toUpperCase()}</span>
                  <div className="parkir-profile-head-text">
                    <strong>{user?.email ?? 'tenant@mall.com'}</strong>
                    <small>Tenant</small>
                  </div>
                </div>
                <button type="button" role="menuitem" className="parkir-profile-item danger" onClick={handleLogout}>
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>

          <button type="button" className="tenant-menu-btn" onClick={() => setMobileOpen(v => !v)}>
            <Menu size={18} />
          </button>
        </div>
        {mobileOpen && (
          <div className="tenant-mobile-drawer">
            <NavLink to="/tenant" end onClick={() => setMobileOpen(false)}>Browse Units</NavLink>
            <NavLink to="/tenant/requests" onClick={() => setMobileOpen(false)}>My Requests</NavLink>
            <NavLink to="/tenant/costs" onClick={() => setMobileOpen(false)}>Costs & Contract</NavLink>
          </div>
        )}
      </header>

      <main className="tenant-main">
        <Outlet />
      </main>

      <footer className="tenant-footer">
        <span>© {brand.appName || 'SIM MALL'} {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
