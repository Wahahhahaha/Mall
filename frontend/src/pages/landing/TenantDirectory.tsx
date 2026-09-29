import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionHeading, TenantGrid, TenantToolbar, TenantCard, useTenantFilter } from '../../components/landing';
import type { TenantItem } from '../../components/landing/Tenant';
import { CATEGORY_ORDER } from './mallData';
import { BACKEND_URL } from '../../config';

interface ApiTenant {
  tenantid: number;
  name: string;
  category: string;
  location?: {
    name: string;
    floor?: {
      floorname: string;
    } | null;
  } | null;
}

function TenantDirectory() {
  const navigate = useNavigate();
  const [dbTenants, setDbTenants] = useState<TenantItem[] | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch(`${BACKEND_URL}/tenants`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ApiTenant[]) => {
        if (ignore || !Array.isArray(data)) return;
        const mapped: TenantItem[] = data.map((t) => ({
          unit: t.location?.name || `TN-${t.tenantid}`,
          name: t.name,
          category: t.category,
          floor: t.location?.floor?.floorname || 'Ground Floor',
        }));
        setDbTenants(mapped);
      })
      .catch(() => {
        if (!ignore) setDbTenants([]);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const tenantsList = useMemo(
    () => dbTenants ?? [],
    [dbTenants]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tenantsList) {
      if (t.category) set.add(t.category);
    }
    const dynamicCats = Array.from(set).sort();
    return ['All', ...(dynamicCats.length ? dynamicCats : CATEGORY_ORDER)];
  }, [tenantsList]);

  const { search, setSearch, category, setCategory, filtered } = useTenantFilter(tenantsList, categories);

  const goToMap = (unit: string) =>
    navigate(`/tenant-directory/map?unit=${encodeURIComponent(unit)}`);

  return (
    <section className="landing-section">
      <SectionHeading
        title="Tenant Directory"
        sub="Find the location of your favorite stores and merchants by floor and unit code."
      />

      <TenantToolbar
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
        search={search}
        onSearchChange={setSearch}
      />

      <TenantGrid
        tenants={filtered}
        renderCard={(t) => <TenantCard tenant={t} onMap={goToMap} />}
      />
    </section>
  );
}

export default TenantDirectory;
