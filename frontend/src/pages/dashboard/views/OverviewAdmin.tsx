import { Store, FileText, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import type { UserInfo } from '../../../types';
import ErpPageHead from '../../../components/dashboard/ErpPageHead';
import ErpKpiCard from '../../../components/dashboard/ErpKpiCard';
import ErpPanel from '../../../components/dashboard/ErpPanel';
import ErpBarChart from '../../../components/dashboard/ErpBarChart';

interface OverviewAdminProps {
  user: UserInfo;
}

const WEEK_TRAFFIC = [
  { label: 'Mon', value: 128 },
  { label: 'Tue', value: 141 },
  { label: 'Wed', value: 132 },
  { label: 'Thu', value: 156 },
  { label: 'Fri', value: 189 },
  { label: 'Sat', value: 244 },
  { label: 'Sun', value: 231 },
];

function OverviewAdmin({ user }: OverviewAdminProps) {
  return (
    <>
      <ErpPageHead
        title="Dashboard"
        sub={
          <>
            Signed in as <b>{user.email}</b> with role <b>Operational Admin</b>. Manage new tenant registrations,
            building utilities, and merchant licensing.
          </>
        }
        chip={<span className="erp-chip navy">Operational Admin</span>}
      />

      <div className="erp-kpi-row">
        <ErpKpiCard
          icon={<Store size={20} />}
          label="Active Tenants"
          value="148 Retail"
          sub="Building occupancy reached 92.5% of lot capacity."
          delta="+3"
        />
        <ErpKpiCard
          icon={<FileText size={20} />}
          label="Invoice Billing"
          value="Rp 420 Jt"
          sub="Water & electricity utility billing for the current period."
          tone="green"
        />
        <ErpKpiCard
          icon={<Calendar size={20} />}
          label="Mall Events"
          value="4 Events"
          sub="Main atrium agendas scheduled this week."
          tone="amber"
        />
      </div>

      <div className="erp-main-grid">
        <ErpPanel icon={<TrendingUp size={16} />} title="Weekly Visitor Activity (index)">
          <ErpBarChart data={WEEK_TRAFFIC} />
        </ErpPanel>

        <ErpPanel icon={<Store size={16} />} title="Quick Modules" className="">
          <ul className="erp-list">
            <li className="erp-list-item">
              <span className="erp-list-badge navy" />
              <div className="erp-list-main">
                <div className="erp-list-title">Tenant Directory</div>
                <div className="erp-list-meta">148 active records</div>
              </div>
              <span className="erp-chip navy">View</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge green" />
              <div className="erp-list-main">
                <div className="erp-list-title">Retail Billing</div>
                <div className="erp-list-meta">Current cycle open</div>
              </div>
              <span className="erp-chip amber">Open</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge amber" />
              <div className="erp-list-main">
                <div className="erp-list-title">Events & Promotions</div>
                <div className="erp-list-meta">4 upcoming agendas</div>
              </div>
              <span className="erp-chip navy">4</span>
            </li>
          </ul>
        </ErpPanel>
      </div>

      <ErpPanel icon={<FileText size={16} />} title="Priority Utilities" action={<ArrowRight size={14} />}>
        <ul className="erp-list">
          <li className="erp-list-item">
            <span className="erp-list-badge red" />
            <div className="erp-list-main">
              <div className="erp-list-title">Electricity — Central AC</div>
              <div className="erp-list-meta">Main building zone · due this month</div>
            </div>
            <span className="erp-list-value">Rp 128 Jt</span>
          </li>
          <li className="erp-list-item">
            <span className="erp-list-badge green" />
            <div className="erp-list-main">
              <div className="erp-list-title">Clean Water — Common Area</div>
              <div className="erp-list-meta">Reimbursed to tenants monthly</div>
            </div>
            <span className="erp-list-value">Rp 46 Jt</span>
          </li>
        </ul>
      </ErpPanel>
    </>
  );
}

export default OverviewAdmin;