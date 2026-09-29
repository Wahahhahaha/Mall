import { TrendingUp, DollarSign, Store, ArrowRight } from 'lucide-react';
import type { UserInfo } from '../../../types';
import ErpPageHead from '../../../components/dashboard/ErpPageHead';
import ErpKpiCard from '../../../components/dashboard/ErpKpiCard';
import ErpPanel from '../../../components/dashboard/ErpPanel';
import ErpBarChart from '../../../components/dashboard/ErpBarChart';

interface OverviewManagerProps {
  user: UserInfo;
}

const MONTH_REVENUE = [
  { label: 'Mar', value: 240 },
  { label: 'Apr', value: 265 },
  { label: 'May', value: 258 },
  { label: 'Jun', value: 302 },
  { label: 'Jul', value: 331 },
  { label: 'Aug', value: 358 },
];

function OverviewManager({ user }: OverviewManagerProps) {
  return (
    <>
      <ErpPageHead
        title="Dashboard"
        sub={
          <>
            Signed in as <b>{user.email}</b> with role <b>General Manager</b>. Evaluate mall retail financial
            reports, operational efficiency, and visitor charts.
          </>
        }
        chip={<span className="erp-chip navy">General Manager</span>}
      />

      <div className="erp-kpi-row">
        <ErpKpiCard
          icon={<TrendingUp size={20} />}
          label="Monthly Foot Traffic"
          value="458.200"
          sub="Visitor visits counted by main gate door sensors."
          delta="+8.2%"
        />
        <ErpKpiCard
          icon={<DollarSign size={20} />}
          label="Accumulated Revenue"
          value="Rp 2,4 M"
          sub="Tenant rent, profit share, and parking tariffs combined."
          tone="green"
          delta="+5.1%"
        />
        <ErpKpiCard
          icon={<Store size={20} />}
          label="Top Tenant"
          value="Uniqlo & Zara"
          sub="Highest sales percentage this quarter."
          tone="amber"
        />
      </div>

      <div className="erp-main-grid">
        <ErpPanel icon={<DollarSign size={16} />} title="Revenue Trend (Rp Juta)">
          <ErpBarChart data={MONTH_REVENUE} />
        </ErpPanel>

        <ErpPanel icon={<Store size={16} />} title="Top Tenants Q3" className="">
          <ul className="erp-list">
            <li className="erp-list-item">
              <span className="erp-list-badge green" />
              <div className="erp-list-main">
                <div className="erp-list-title">Uniqlo — GF-01</div>
                <div className="erp-list-meta">Sales share 4.2%</div>
              </div>
              <span className="erp-chip green">+12%</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge navy" />
              <div className="erp-list-main">
                <div className="erp-list-title">Zara — GF-02</div>
                <div className="erp-list-meta">Sales share 3.9%</div>
              </div>
              <span className="erp-chip green">+9%</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge amber" />
              <div className="erp-list-main">
                <div className="erp-list-title">Cinema 21 — LG-3</div>
                <div className="erp-list-meta">Sales share 3.1%</div>
              </div>
              <span className="erp-chip amber">+4%</span>
            </li>
          </ul>
        </ErpPanel>
      </div>

      <ErpPanel icon={<TrendingUp size={16} />} title="Operational Notes" action={<ArrowRight size={14} />}>
        <ul className="erp-list">
          <li className="erp-list-item">
            <span className="erp-list-badge green" />
            <div className="erp-list-main">
              <div className="erp-list-title">Occupancy</div>
              <div className="erp-list-meta">92.5% of total lettable area</div>
            </div>
            <span className="erp-list-value">92,5%</span>
          </li>
          <li className="erp-list-item">
            <span className="erp-list-badge amber" />
            <div className="erp-list-main">
              <div className="erp-list-title">Weekend Conversion</div>
              <div className="erp-list-meta">Visitor-to-footfall ratio</div>
            </div>
            <span className="erp-list-value">31%</span>
          </li>
          <li className="erp-list-item">
            <span className="erp-list-badge red" />
            <div className="erp-list-main">
              <div className="erp-list-title">Avg. Lease Renewal</div>
              <div className="erp-list-meta">Remaining before renewal window</div>
            </div>
            <span className="erp-list-value">14 mo</span>
          </li>
        </ul>
      </ErpPanel>
    </>
  );
}

export default OverviewManager;