import CountUp from './CountUp';

export interface StatItem {
  value: number | string;
  suffix?: string;
  label: string;
}

interface StatsRowProps {
  items: StatItem[];
  variant?: 'hero' | 'landing';
  className?: string;
}

export function StatValue({ value, suffix }: { value: number | string; suffix?: string }) {
  if (typeof value === 'number') {
    return <CountUp value={value} suffix={suffix} />;
  }
  return (
    <>
      {value}
      {suffix}
    </>
  );
}

export default function StatsRow({ items, variant = 'hero', className }: StatsRowProps) {
  if (variant === 'landing') {
    return (
      <div className={`landing-stats ${className ?? ''}`}>
        {items.map((it) => (
          <div key={it.label} className="landing-stat-item">
            <span className="landing-stat-val">
              <StatValue value={it.value} suffix={it.suffix} />
            </span>
            <span className="landing-stat-lbl">{it.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="hero-stats">
      {items.map((it) => (
        <div key={it.label} className="hero-stat">
          <span className="hero-stat-value">
            <StatValue value={it.value} suffix={it.suffix} />
          </span>
          <span className="hero-stat-label">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
