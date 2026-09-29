import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal';

export interface FacilityItem {
  name: string;
  desc?: string;
  location?: string;
  icon: LucideIcon;
}

interface FacilityCardProps {
  facility: FacilityItem;
}

export function FacilityCard({ facility }: FacilityCardProps) {
  const Icon = facility.icon;
  return (
    <article className="facility-card">
      <span className="facility-icon"><Icon size={22} /></span>
      <h3 className="facility-name">{facility.name}</h3>
      {facility.desc && <p className="facility-desc">{facility.desc}</p>}
      {facility.location && <span className="facility-location">{facility.location}</span>}
    </article>
  );
}

interface FacilityGridProps {
  facilities: FacilityItem[];
  renderCard?: (facility: FacilityItem, index: number) => ReactNode;
}

export function FacilityGrid({ facilities, renderCard }: FacilityGridProps) {
  return (
    <div className="facility-grid">
      {facilities.map((f, i) => (
        <Reveal key={f.name} delay={(i % 4) * 60}>
          {renderCard ? renderCard(f, i) : <FacilityCard facility={f} />}
        </Reveal>
      ))}
    </div>
  );
}

interface FacilityPillProps {
  facility: FacilityItem;
  to: string;
  onClick?: () => void;
}

export function FacilityPill({ facility, to, onClick }: FacilityPillProps) {
  const Icon = facility.icon;
  return (
    <Link to={to} className="facility-pill" onClick={onClick}>
      <span className="facility-icon"><Icon size={20} /></span>
      <span className="facility-pill-name">{facility.name}</span>
      {facility.location && <span className="facility-pill-loc">{facility.location}</span>}
    </Link>
  );
}
