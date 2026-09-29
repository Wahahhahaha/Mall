import React, { useState } from 'react';
import { Store, TrendingUp, DollarSign, Plus, FileText } from 'lucide-react';
import ErpPageHead from '../../../components/dashboard/ErpPageHead';
import ErpKpiCard from '../../../components/dashboard/ErpKpiCard';
import ErpPanel from '../../../components/dashboard/ErpPanel';
import ErpBarChart from '../../../components/dashboard/ErpBarChart';

const WEEK_TURNOVER = [
  { label: 'Tue', value: 15.5 },
  { label: 'Wed', value: 18.2 },
  { label: 'Thu', value: 12.0 },
  { label: 'Fri', value: 14.7 },
  { label: 'Sat', value: 22.4 },
  { label: 'Sun', value: 26.1 },
];

function OverviewTenant() {
  const [salesLogs, setSalesLogs] = useState<Array<{
    id: string;
    date: string;
    amount: number;
    fee: number;
    status: 'Pending' | 'Approved';
  }>>([
    { id: '1', date: '2026-08-21', amount: 15500000, fee: 1550000, status: 'Approved' },
    { id: '2', date: '2026-08-22', amount: 18200000, fee: 1820000, status: 'Approved' },
    { id: '3', date: '2026-08-23', amount: 12000000, fee: 1200000, status: 'Pending' },
  ]);
  const [salesDate, setSalesDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesAmount, setSalesAmount] = useState('');

  const pendingCount = salesLogs.filter((log) => log.status === 'Pending').length;

  const handleAddSales = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(salesAmount);
    if (!amt || amt <= 0 || !salesDate) return;

    const newLog = {
      id: Date.now().toString(),
      date: salesDate,
      amount: amt,
      fee: amt * 0.10,
      status: 'Pending' as const
    };

    setSalesLogs([newLog, ...salesLogs]);
    setSalesAmount('');
  };

  return (
    <>
      <ErpPageHead
        title="Dashboard"
        sub={
          <>
            Use the <b>SIM Mall Tenant</b> portal to report your daily sales data according to the 10% profit-sharing
            lease contract.
          </>
        }
        chip={<span className="erp-chip green">Active · Retail Type</span>}
      />

      <div className="erp-kpi-row">
        <ErpKpiCard
          icon={<Store size={20} />}
          label="Contract Status"
          value="GF-12 Retail"
          sub="Lease active — expires Dec 31, 2027."
          tone="green"
        />
        <ErpKpiCard
          icon={<TrendingUp size={20} />}
          label="Turnover This Month"
          value="Rp 45,7 Jt"
          sub="Cumulative turnover reported to management."
          delta="+4.3%"
        />
        <ErpKpiCard
          icon={<DollarSign size={20} />}
          label="Mall Profit Share (10%)"
          value="Rp 4,57 Jt"
          sub="Monthly profit-share billed in the lease invoice."
          tone="amber"
        />
        <ErpKpiCard
          icon={<FileText size={20} />}
          label="Pending Reports"
          value={`${pendingCount}`}
          sub="Daily turnovers awaiting audit."
          tone="rose"
        />
      </div>

      <div className="erp-main-grid">
        <ErpPanel icon={<TrendingUp size={16} />} title="Turnover Last 7 Days (Rp Juta)">
          <ErpBarChart data={WEEK_TURNOVER} />
        </ErpPanel>

        <ErpPanel icon={<Store size={16} />} title="Contract Summary" className="">
          <ul className="erp-list">
            <li className="erp-list-item">
              <span className="erp-list-badge green" />
              <div className="erp-list-main">
                <div className="erp-list-title">Unit</div>
                <div className="erp-list-meta">GF-12 · Retail Type</div>
              </div>
              <span className="erp-chip green">Active</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge navy" />
              <div className="erp-list-main">
                <div className="erp-list-title">Profit Share</div>
                <div className="erp-list-meta">10% of reported turnover</div>
              </div>
              <span className="erp-chip navy">10%</span>
            </li>
            <li className="erp-list-item">
              <span className="erp-list-badge amber" />
              <div className="erp-list-main">
                <div className="erp-list-title">Expiry</div>
                <div className="erp-list-meta">Dec 31, 2027</div>
              </div>
              <span className="erp-chip amber">14 mo</span>
            </li>
          </ul>
        </ErpPanel>
      </div>

      <ErpPanel icon={<DollarSign size={16} />} title="Daily Sales Turnover Input (Simulator)" className="">
        <form onSubmit={handleAddSales} className="simulator-form">
          <div className="simulator-input-group">
            <label className="form-label">Transaction Date</label>
            <input
              type="date"
              className="simulator-input"
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
            />
          </div>
          <div className="simulator-input-group">
            <label className="form-label">Daily Total Turnover (Rp)</label>
            <input
              type="number"
              className="simulator-input"
              placeholder="Enter turnover amount"
              value={salesAmount}
              onChange={(e) => setSalesAmount(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Report Turnover
          </button>
        </form>

        <h4 style={{ margin: '20px 0 10px 0', color: 'var(--text-primary)' }}>Daily Turnover Report History</h4>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reported Turnover</th>
                <th>Mall Profit Share (10%)</th>
                <th>Audit Status</th>
              </tr>
            </thead>
            <tbody>
              {salesLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--mono)' }}>{log.date}</td>
                  <td style={{ fontWeight: 'bold', fontFamily: 'var(--mono)' }}>Rp {log.amount.toLocaleString('id-ID')}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>Rp {log.fee.toLocaleString('id-ID')}</td>
                  <td>
                    <span className={`status-badge ${log.status === 'Pending' ? 'outline' : 'solid'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ErpPanel>
    </>
  );
}

export default OverviewTenant;