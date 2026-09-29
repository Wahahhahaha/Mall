import type { ReactNode } from 'react';

type KpiTone = 'navy' | 'green' | 'amber' | 'rose';

interface ErpKpiCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  delta?: string;
  tone?: KpiTone;
}

function ErpKpiCard({ icon, label, value, sub, delta, tone = 'navy' }: ErpKpiCardProps) {
  return (
    <div className={`erp-kpi erp-kpi--${tone}`}>
      <div className="erp-kpi-top">
        <div className="erp-kpi-icon">{icon}</div>
        {delta && (
          <span className={`erp-kpi-delta ${delta.startsWith('-') ? 'down' : ''}`}>{delta}</span>
        )}
      </div>
      <span className="erp-kpi-label">{label}</span>
      <div className="erp-kpi-value">{value}</div>
      {sub && <p className="erp-kpi-sub">{sub}</p>}
    </div>
  );
}

export default ErpKpiCard;