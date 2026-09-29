import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Building2, MapPin, Car, FileText, Wallet, Layers, Activity, RefreshCw, Store } from 'lucide-react';
import { BACKEND_URL } from '../../../config';
import type { UserInfo, DBStats } from '../../../types';
import ErpPageHead from '../../../components/dashboard/ErpPageHead';
import ErpKpiCard from '../../../components/dashboard/ErpKpiCard';
import ErpPanel from '../../../components/dashboard/ErpPanel';
import ErpBarChart from '../../../components/dashboard/ErpBarChart';

interface OverviewSuperadminProps {
  user: UserInfo;
}

const FALLBACK_LEVELS = [
  { label: 'Superadmin', value: 1 },
  { label: 'Admin', value: 1 },
  { label: 'Parkir', value: 1 },
  { label: 'Manager', value: 1 },
  { label: 'Tenant', value: 1 },
];

function OverviewSuperadmin({ user }: OverviewSuperadminProps) {
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    axios
      .get(`${BACKEND_URL}/auth/stats`)
      .then((response) => {
        if (!ignore) setDbStats(response.data);
      })
      .catch((err) => console.error('Failed to fetch stats', err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/auth/stats`);
      setDbStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = dbStats?.levels
    ? dbStats.levels.map((lvl) => ({ label: lvl.levelname, value: lvl._count.users }))
    : FALLBACK_LEVELS;

  const fmt = (n: number) => (n ?? 0).toLocaleString('id-ID');
  const fmtRp = (n: number) => `Rp ${fmt(n)}`;

  const s = dbStats as DBStats | null;

  return (
    <>
      <ErpPageHead
        title="Dashboard"
        sub={
          <>
            Signed in as <b>{user.email}</b>. Live statistics of the entire
            mall system — users, tenants, events, and operations.
          </>
        }
      />

      <div className="erp-kpi-row">
        <ErpKpiCard
          icon={<Store size={20} />}
          label="Registered Tenants"
          value={s ? fmt(s.tenantCount) : '—'}
          sub="Active tenant units across all floors."
          delta="+3"
        />
        <ErpKpiCard
          icon={<Users size={20} />}
          label="System Users"
          value={s ? fmt(s.userCount) : '—'}
          sub="Superadmin, Admin, Parkir, Manager & Tenant accounts."
        />
        <ErpKpiCard
          icon={<Car size={20} />}
          label="Parking Tickets"
          value={s ? fmt(s.parkingCount) : '—'}
          sub={`${s ? fmt(s.activeParking) : 0} vehicles still parked.`}
          tone="green"
        />
        <ErpKpiCard
          icon={<Wallet size={20} />}
          label="Monthly Rent Base"
          value={s ? fmtRp(s.mallFeeSum) : '—'}
          sub="Sum of unit annual prices (locations.pricePerYear / 12)."
          tone="amber"
        />
      </div>

      <div className="erp-main-grid">
        <ErpPanel icon={<Layers size={16} />} title="Users per Role">
          <ErpBarChart data={chartData} />
        </ErpPanel>

        <ErpPanel icon={<Activity size={16} />} title="System Summary" className="">
          <ul className="erp-list">
            <li className="erp-list-item">
              <span className="erp-list-badge navy" />
              <div className="erp-list-main">
                <div className="erp-list-title">Events</div>
                <div className="erp-list-meta">Scheduled mall agendas</div>
              </div>
              <span className="erp-list-value">{s ? fmt(s.eventCount) : '—'}</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge green" />
              <div className="erp-list-main">
                <div className="erp-list-title">Floors</div>
                <div className="erp-list-meta">Mapped building levels</div>
              </div>
              <span className="erp-list-value">{s ? fmt(s.floorCount) : '—'}</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge amber" />
              <div className="erp-list-main">
                <div className="erp-list-title">Indoor Locations</div>
                <div className="erp-list-meta">Facilities on the indoor map</div>
              </div>
              <span className="erp-list-value">{s ? fmt(s.locationCount) : '—'}</span>
            </li>
          </ul>
        </ErpPanel>
      </div>

      <ErpPanel
        icon={<FileText size={16} />}
        title="Tenant Reservations"
        action={
          <button onClick={fetchStats} disabled={loading} className="btn-icon-action" aria-label="Refresh">
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          </button>
        }
      >
        <div className="erp-kpi-row" style={{ marginBottom: 0 }}>
          <ErpKpiCard
            icon={<FileText size={20} />}
            label="Total Requests"
            value={s ? fmt(s.requestCount) : '—'}
            sub="All submitted reservation forms."
          />
          <ErpKpiCard
            icon={<Building2 size={20} />}
            label="Active Contracts"
            value={s ? fmt(s.activeRequests) : '—'}
            sub="Reservations currently ongoing."
            tone="green"
          />
          <ErpKpiCard
            icon={<Users size={20} />}
            label="Pending Approval"
            value={s ? fmt(s.pendingRequests) : '—'}
            sub="Awaiting approval in the workflow."
            tone="amber"
          />
          <ErpKpiCard
            icon={<MapPin size={20} />}
            label="Access Levels"
            value={s ? fmt(s.levelCount) : '—'}
            sub="Active role structure configuration."
            tone="rose"
          />
        </div>
      </ErpPanel>
    </>
  );
}

export default OverviewSuperadmin;