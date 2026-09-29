import type { ReactNode } from 'react';

interface ErpPageHeadProps {
  title: string;
  sub?: ReactNode;
  chip?: ReactNode;
}

function ErpPageHead({ title, sub, chip }: ErpPageHeadProps) {
  return (
    <header className="erp-page-head">
      <div>
        <h2 className="erp-page-title">{title}</h2>
        {sub && <p className="erp-page-sub">{sub}</p>}
      </div>
      {chip && <div className="erp-page-chip">{chip}</div>}
    </header>
  );
}

export default ErpPageHead;