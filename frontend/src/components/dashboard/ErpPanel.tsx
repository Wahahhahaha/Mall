import type { ReactNode } from 'react';

interface ErpPanelProps {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

function ErpPanel({ icon, title, action, children, className = '' }: ErpPanelProps) {
  return (
    <section className={`erp-panel ${className}`}>
      <header className="erp-panel-head">
        <h3 className="erp-panel-title">
          {icon && <span className="erp-panel-icon">{icon}</span>}
          <span>{title}</span>
        </h3>
        {action && <div className="erp-panel-action">{action}</div>}
      </header>
      <div className="erp-panel-body">{children}</div>
    </section>
  );
}

export default ErpPanel;