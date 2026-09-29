import { useState } from 'react';
import type { TenantItem } from './Tenant';

export function useTenantFilter(tenants: TenantItem[], categories: string[]) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(categories[0] ?? 'All');

  const filtered = tenants.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.unit.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || t.category === category;
    return matchSearch && matchCategory;
  });

  return { search, setSearch, category, setCategory, filtered };
}
