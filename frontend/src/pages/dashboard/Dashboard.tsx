import { useState, useEffect, useSyncExternalStore } from 'react';
import { useNavigate, useLocation, NavLink, Link, Outlet, Navigate } from 'react-router-dom';
import {
  Building2,
  LogOut,
  Clock,
  LayoutDashboard,
  Menu,
  Calendar,
  Store,
  Users,
  Database,
  Lock,
  Settings,
  FileText,
  Car,
  Map,
  Layers,
  TrendingUp,
  DollarSign,
  Trash,
  X,
  ChevronDown,
  User,
  Search,
  BarChart3,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  ClipboardList,
  Wallet
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserInfo } from '../../types';
import { getAppSettings, subscribeAppSettings } from '../../components/appSettingsBus';
import { toast } from '../../components/toastBus';
import { usePermissions } from '../../permissionBus';

const PAGE_TITLES: Record<string, string> = {
  '': 'Dashboard',
  parkir: 'Parking',
  map: 'Indoor Map',
  'event-data': 'Event Data',
  'floor-data': 'Floor Data',
  'tenant-data': 'Tenant Data',
  'lease-requests': 'Lease Requests',
  'user-data': 'User Data',
  'activity-log': 'Activity Log',
  backup: 'Backup',
  trash: 'Trash',
  permission: 'Permission',
  setting: 'System Settings',
  'report/daily': 'Daily Report',
  'report/weekly': 'Weekly Report',
  'report/monthly': 'Monthly Report',
  'report/yearly': 'Yearly Report',
  profile: 'My Profile',
};

const SEARCH_MENU: { label: string; path: string; icon: LucideIcon; permKey: string }[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard , permKey: 'dashboard' },
  { label: 'Parking', path: '/dashboard/parkir', icon: Car , permKey: 'parkir' },
  { label: 'Indoor Map', path: '/dashboard/map', icon: Map , permKey: 'map' },
  { label: 'Event Data', path: '/dashboard/event-data', icon: Calendar , permKey: 'event-data' },
  { label: 'Floor Data', path: '/dashboard/floor-data', icon: Layers , permKey: 'floor-data' },
  { label: 'Tenant Data', path: '/dashboard/tenant-data', icon: Store , permKey: 'tenant-data' },
  { label: 'Lease Requests', path: '/dashboard/lease-requests', icon: ClipboardList , permKey: 'lease-requests' },
  { label: 'User Data', path: '/dashboard/user-data', icon: Users , permKey: 'user-data' },
  { label: 'Activity Log', path: '/dashboard/activity-log', icon: Clock , permKey: 'activity-log' },
  { label: 'Backup', path: '/dashboard/backup', icon: Database , permKey: 'backup' },
  { label: 'Trash', path: '/dashboard/trash', icon: Trash , permKey: 'trash' },
  { label: 'Permission', path: '/dashboard/permission', icon: Lock , permKey: 'permission' },
  { label: 'System Settings', path: '/dashboard/setting', icon: Settings , permKey: 'setting' },
  { label: 'Daily Report', path: '/dashboard/report/daily', icon: CalendarDays , permKey: 'report' },
  { label: 'Weekly Report', path: '/dashboard/report/weekly', icon: CalendarRange , permKey: 'report' },
  { label: 'Monthly Report', path: '/dashboard/report/monthly', icon: BarChart3 , permKey: 'report' },
  { label: 'Yearly Report', path: '/dashboard/report/yearly', icon: CalendarCheck , permKey: 'report' },
  { label: 'My Profile', path: '/dashboard/profile', icon: User , permKey: 'profile' },
];

function Dashboard() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const user: UserInfo = JSON.parse(localStorage.getItem('user')!);
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);
  const perms = usePermissions();

  const slug = pathname.replace(/^\/dashboard\/?/, '');
  const pageTitle = slug.startsWith('event-data/') ? 'Event Details' : PAGE_TITLES[slug] ?? 'Dashboard';

  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    return SEARCH_MENU.filter((item) => perms.can(item.permKey, 'view')).map((item) => {
      const label = item.label.toLowerCase();
      if (!terms.every((t) => label.includes(t))) return null;
      let score = 0;
      if (label.startsWith(q)) score = 2;
      else if (label.includes(q)) score = 1;
      return { item, score };
    })
      .filter((r): r is { item: (typeof SEARCH_MENU)[number]; score: number } => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((r) => r.item);
  })();

  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onDocClick = () => setIsUserMenuOpen(false);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.topbar-search')) setIsSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
    };
  }, [isSearchOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (user.level.toLowerCase() === 'parkir') {
    return <Navigate to="/parkir" replace />;
  }

  const renderSidebarItems = () => {
    if (!user) return null;
    const role = user.level.toLowerCase();

    const navClass = (isActive: boolean) =>
      `sidebar-submenu-item ${isActive ? 'active' : ''}`;

    return (
      <div className="sidebar-menu">
        {perms.can('dashboard', 'view') && (
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
        )}

        {perms.can('parkir', 'view') && (
          <NavLink
            to="/dashboard/parkir"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Car size={18} />
            <span>Parking</span>
          </NavLink>
        )}

        {perms.can('map', 'view') && (
          <NavLink
            to="/dashboard/map"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Map size={18} />
            <span>Indoor Map</span>
          </NavLink>
        )}

        {(perms.can('event-data', 'view') ||
          perms.can('floor-data', 'view') ||
          perms.can('tenant-data', 'view') ||
          perms.can('lease-requests', 'view') ||
          perms.can('user-data', 'view')) && (
          <>
            <div className="sidebar-menu-header">Data</div>
            <div className="sidebar-submenu">
              {perms.can('event-data', 'view') && (
                <NavLink to="/dashboard/event-data" className={({ isActive }) => navClass(isActive)}>
                  <Calendar size={14} />
                  <span>Event data</span>
                </NavLink>
              )}
              {perms.can('floor-data', 'view') && (
                <NavLink to="/dashboard/floor-data" className={({ isActive }) => navClass(isActive)}>
                  <Layers size={14} />
                  <span>Floor data</span>
                </NavLink>
              )}
              {perms.can('tenant-data', 'view') && (
                <NavLink to="/dashboard/tenant-data" className={({ isActive }) => navClass(isActive)}>
                  <Store size={14} />
                  <span>Tenant data</span>
                </NavLink>
              )}
              {perms.can('lease-requests', 'view') && (
                <NavLink to="/dashboard/lease-requests" className={({ isActive }) => navClass(isActive)}>
                  <ClipboardList size={14} />
                  <span>Lease requests</span>
                </NavLink>
              )}
              {perms.can('user-data', 'view') && (
                <NavLink to="/dashboard/user-data" className={({ isActive }) => navClass(isActive)}>
                  <Users size={14} />
                  <span>User data</span>
                </NavLink>
              )}
            </div>
          </>
        )}

        {perms.can('report', 'view') && (
          <>
            <div className="sidebar-menu-header">Report</div>
            <div className="sidebar-submenu">
              <NavLink to="/dashboard/report/daily" className={({ isActive }) => navClass(isActive)}>
                <CalendarDays size={14} />
                <span>Daily Report</span>
              </NavLink>
              <NavLink to="/dashboard/report/weekly" className={({ isActive }) => navClass(isActive)}>
                <CalendarRange size={14} />
                <span>Weekly Report</span>
              </NavLink>
              <NavLink to="/dashboard/report/monthly" className={({ isActive }) => navClass(isActive)}>
                <BarChart3 size={14} />
                <span>Monthly Report</span>
              </NavLink>
              <NavLink to="/dashboard/report/yearly" className={({ isActive }) => navClass(isActive)}>
                <CalendarCheck size={14} />
                <span>Yearly Report</span>
              </NavLink>
            </div>
          </>
        )}

        {(perms.can('activity-log', 'view') ||
          perms.can('backup', 'view') ||
          perms.can('trash', 'view') ||
          perms.can('permission', 'view') ||
          perms.can('setting', 'view')) && (
          <>
            <div className="sidebar-menu-header">System</div>
            <div className="sidebar-submenu">
              {perms.can('activity-log', 'view') && (
                <NavLink to="/dashboard/activity-log" className={({ isActive }) => navClass(isActive)}>
                  <Clock size={14} />
                  <span>Activity log</span>
                </NavLink>
              )}
              {perms.can('backup', 'view') && (
                <NavLink to="/dashboard/backup" className={({ isActive }) => navClass(isActive)}>
                  <Database size={14} />
                  <span>Backup</span>
                </NavLink>
              )}
              {perms.can('trash', 'view') && (
                <NavLink to="/dashboard/trash" className={({ isActive }) => navClass(isActive)}>
                  <Trash size={14} />
                  <span>Trash</span>
                </NavLink>
              )}
              {perms.can('permission', 'view') && (
                <NavLink to="/dashboard/permission" className={({ isActive }) => navClass(isActive)}>
                  <Lock size={14} />
                  <span>Permission</span>
                </NavLink>
              )}
              {perms.can('setting', 'view') && (
                <NavLink to="/dashboard/setting" className={({ isActive }) => navClass(isActive)}>
                  <Settings size={14} />
                  <span>Setting</span>
                </NavLink>
              )}
            </div>
          </>
        )}

        {role === 'admin' && (
          <div className="sidebar-submenu">
            <div className="sidebar-submenu-item" onClick={() => toast('Coming soon: Tenant Directory feature')}>
              <Store size={14} />
              <span>Tenant Directory</span>
            </div>
            <div className="sidebar-submenu-item" onClick={() => toast('Coming soon: Retail Billing feature')}>
              <FileText size={14} />
              <span>Retail Billing</span>
            </div>
            <div className="sidebar-submenu-item" onClick={() => toast('Coming soon: Events & Promotions feature')}>
              <Calendar size={14} />
              <span>Events & Promotions</span>
            </div>
          </div>
        )}

        {role === 'parkir' && (
          <div className="sidebar-submenu">
            <div className="sidebar-submenu-item" onClick={() => toast('Coming soon: Barrier Gate feature')}>
              <Car size={14} />
              <span>Barrier Gate</span>
            </div>
            <div className="sidebar-submenu-item" onClick={() => toast('Coming soon: Ticket Log feature')}>
              <FileText size={14} />
              <span>Ticket Log</span>
            </div>
          </div>
        )}

        {role === 'manager' && (
          <div className="sidebar-submenu">
            <div className="sidebar-submenu-item" onClick={() => toast('Coming soon: Tenant Analytics feature')}>
              <TrendingUp size={14} />
              <span>Tenant Analytics</span>
            </div>
            <div className="sidebar-submenu-item" onClick={() => toast('Coming soon: Cash Flow feature')}>
              <DollarSign size={14} />
              <span>Building Cash Flow</span>
            </div>
          </div>
        )}

        {role === 'tenant' && (
          <div className="sidebar-submenu">
            <NavLink to="/tenant" className={({ isActive }) => navClass(isActive)}>
              <Store size={14} />
              <span>Request Tenant (Portal Baru)</span>
            </NavLink>
            <NavLink to="/tenant/requests" className={({ isActive }) => navClass(isActive)}>
              <FileText size={14} />
              <span>Pengajuan Saya</span>
            </NavLink>
            <NavLink to="/tenant/costs" className={({ isActive }) => navClass(isActive)}>
              <Wallet size={14} />
              <span>Costs &amp; Invoices</span>
            </NavLink>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`dashboard-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
      {isMobileOpen && (
        <div className="sidebar-backdrop show" onClick={() => setIsMobileOpen(false)} />
      )}
      <aside
        className={`dashboard-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) setIsMobileOpen(false);
        }}
      >
        <div className="sidebar-scroll">
          <div className="sidebar-brand">
            <button
              className="sidebar-toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              {isCollapsed ? <Menu size={14} /> : <X size={14} />}
            </button>
            <div className="sidebar-brand-group">
              {brand.appLogo ? (
                <img src={brand.appLogo} alt={brand.appName} className="sidebar-logo-img" />
              ) : (
                <div className="sidebar-logo">
                  <Building2 size={18} />
                </div>
              )}
              {brand.ready && brand.brandMode === 'name' && brand.appName && (
                <span className="sidebar-name">{brand.appName}</span>
              )}
            </div>
            <button
              className="sidebar-close-btn"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>
          {renderSidebarItems()}
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              className="sidebar-mobile-btn"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <span className="topbar-title">{pageTitle}</span>
          </div>
          <div className="topbar-search">
            <div className="topbar-search-box">
              <Search size={15} />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchOpen(true);
                }}
                placeholder="Search menu..."
                aria-label="Search menu"
              />
              {searchQuery && (
                <button
                  className="topbar-search-clear"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {isSearchOpen && searchQuery.trim() && (
              <div className="topbar-search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="topbar-search-empty">No menu found</div>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.path}
                      className="topbar-search-item"
                      onClick={() => {
                        navigate(r.path);
                        setSearchQuery('');
                        setIsSearchOpen(false);
                        setIsMobileOpen(false);
                      }}
                    >
                      <r.icon size={15} />
                      <span>{r.label}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="topbar-right">
            <div className="topbar-user" onClick={(e) => e.stopPropagation()}>
              <button
                className="topbar-user-trigger"
                onClick={() => setIsUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
              >
                <span className="topbar-user-email">{user.email}</span>
                <ChevronDown size={14} className={isUserMenuOpen ? 'chevron-up' : ''} />
              </button>
              {isUserMenuOpen && (
                <div className="topbar-user-menu" role="menu">
                  <Link
                    to="/dashboard/profile"
                    className="topbar-user-menu-item"
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <User size={15} />
                    <span>Profile</span>
                  </Link>
                  <button
                    className="topbar-user-menu-item danger"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut size={15} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

export default Dashboard;
