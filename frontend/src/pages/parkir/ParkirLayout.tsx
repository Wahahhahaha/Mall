import { useRef, useEffect, useSyncExternalStore, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, LogOut, UserCog } from 'lucide-react';
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

export default function ParkirLayout() {
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);
  const navigate = useNavigate();
  const user = readUser();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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

  if (user && user.level.toLowerCase() !== 'parkir') {
    return <Navigate to="/dashboard" replace />;
  }

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

  return (
    <div className="parkir-shell">
      <header className="parkir-navbar">
        <div className="parkir-nav-inner">
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

          <div
            ref={profileBoxRef}
            className={`parkir-profile ${profileMenuOpen ? 'open' : ''}`}
            onMouseEnter={() => {
              scheduleOpen();
            }}
            onMouseLeave={() => {
              scheduleClose();
            }}
          >
            <button
              type="button"
              className="parkir-user-chip"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              onClick={handleChipClick}
            >
              <span className="parkir-avatar">{(user?.email ?? '?').substring(0, 1).toUpperCase()}</span>
              <span className="parkir-user-mail">{user?.email ?? 'parkir'}</span>
              <ChevronDown size={13} className={`parkir-chip-chevron ${profileMenuOpen ? 'open' : ''}`} />
            </button>

            {profileMenuOpen && (
              <div className="parkir-profile-menu" role="menu">
                <div className="parkir-profile-head">
                  <span className="parkir-avatar large">{(user?.email ?? '?').substring(0, 1).toUpperCase()}</span>
                  <div className="parkir-profile-head-text">
                    <strong>{user?.email ?? 'parkir@mall.com'}</strong>
                    <small>Parkir &middot; Gate Staff</small>
                  </div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="parkir-profile-item"
                  onClick={() => {
                    clearTimers();
                    navigate('/parkir/profile');
                  }}
                >
                  <UserCog size={15} /> Profile
                </button>
                <button type="button" role="menuitem" className="parkir-profile-item danger" onClick={handleLogout}>
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="parkir-main">
        <Outlet />
      </main>

      <footer className="parkir-footer">
        &copy; 2026 All Rights Reserved{brand.ready && brand.brandMode === 'name' && brand.appName ? ` &middot; ${brand.appName}` : ''}
      </footer>
    </div>
  );
}