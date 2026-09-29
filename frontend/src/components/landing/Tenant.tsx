import { MapPin, Navigation, Search } from 'lucide-react';
import Reveal from '../Reveal';
import type { ReactNode } from 'react';

export interface TenantItem {
  unit: string;
  name: string;
  category: string;
  floor: string;
}

interface TenantCardProps {
  tenant: TenantItem;
  onMap?: (unit: string) => void;
  mapButtonText?: string;
}

export function TenantCard({ tenant, onMap, mapButtonText = 'View Indoor Map' }: TenantCardProps) {
  return (
    <article className="tenant-card">
      <span className="tenant-unit">{tenant.unit}</span>
      <h3 className="tenant-name">{tenant.name}</h3>
      <span className="tenant-category">{tenant.category}</span>
      <span className="tenant-floor">
        <MapPin size={13} /> {tenant.floor}
      </span>
      {onMap && (
        <button type="button" className="btn-minimap" onClick={() => onMap(tenant.unit)}>
          <Navigation size={13} /> {mapButtonText}
        </button>
      )}
    </article>
  );
}

interface TenantToolbarProps {
  categories: string[];
  category: string;
  onCategoryChange: (c: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  placeholder?: string;
}

export function TenantToolbar({
  categories,
  category,
  onCategoryChange,
  search,
  onSearchChange,
  placeholder = 'Search tenant name or unit code...',
}: TenantToolbarProps) {
  return (
    <div className="tenant-toolbar">
      <div className="search-bar">
        <Search size={15} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="chip-row">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${category === c ? 'active' : ''}`}
            onClick={() => onCategoryChange(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TenantGridProps {
  tenants: TenantItem[];
  renderCard?: (tenant: TenantItem, index: number) => ReactNode;
  emptyText?: string;
}

export function TenantGrid({ tenants, renderCard, emptyText = 'No tenants match your search.' }: TenantGridProps) {
  if (tenants.length === 0) {
    return <p className="landing-empty">{emptyText}</p>;
  }
  return (
    <div className="tenant-grid">
      {tenants.map((t, i) => (
        <Reveal key={t.unit} delay={(i % 4) * 60}>
          {renderCard ? renderCard(t, i) : <TenantCard tenant={t} />}
        </Reveal>
      ))}
    </div>
  );
}
