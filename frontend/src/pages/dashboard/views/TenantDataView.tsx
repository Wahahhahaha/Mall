import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Pencil, Plus, Store, Trash2, LayoutGrid, Map as MapIcon, Crosshair, ZoomIn, ZoomOut, RotateCcw, MapPin, X, GripVertical } from 'lucide-react';
import Modal from '../../../components/Modal';
import SearchBar from '../../../components/SearchBar';
import Select from '../../../components/Select';
import ImageCropModal from '../../../components/ImageCropModal';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';
import { buildMeta } from '../../../utils/meta';

interface LocationRef {
  id: number;
  name: string;
  floorid: number | null;
  x: number;
  y: number;
  pricePerYear: number | null;
  floor?: { floorid: number; floorname: string } | null;
}
interface TenantRow {
  tenantid: number;
  name: string;
  category: string;
  logoUrl: string | null;
  leaseUntil: string | null;
  locationid: number | null;
  location?: LocationRef | null;
}
interface FloorOption { floorid: number; floorname: string; floorcode: string | null; }
interface TenantForm { locationid: string; name: string; category: string; leaseUntil: string; }
const emptyForm: TenantForm = { locationid: '', name: '', category: '', leaseUntil: '' };
const locationLabel = (t: TenantRow) => t.location?.name ?? '-';
// unit price lives on the location: monthly rent = annual price / 12
const monthlyRent = (t: TenantRow) => Math.round((t.location?.pricePerYear ?? 0) / 12);
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const formatDate = (iso: string | null) => { if (!iso) return '-'; return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }); };
const formatRupiah = (n: number) => `Rp ${n.toLocaleString('en-US')}`;

const SVG_W = 5016; const SVG_H = 5016;
type ViewMode = 'card' | 'map';
const PAGE_SIZE = 20;
interface MapPopover { loc: LocationRef; tenant: TenantRow | null; left: number; top: number; }
const TENANT_CATEGORIES = ['Fashion', 'F&B', 'Beauty', 'Electronics', 'Entertainment', 'Furniture'];

function TenantDataView() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [floors, setFloors] = useState<FloorOption[]>([]);
  const [locations, setLocations] = useState<LocationRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [pendingCrop, setPendingCrop] = useState<{ url: string; fileName: string } | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  // map states
  const [selectedForMap, setSelectedForMap] = useState<number | null>(null);
  const [mapFloor, setMapFloor] = useState<string>('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [popover, setPopover] = useState<MapPopover | null>(null);
  const [mapPage, setMapPage] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1); const [tx, setTx] = useState(0); const [ty, setTy] = useState(0);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const didPanRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      axios.get<TenantRow[]>(`${BACKEND_URL}/tenants`),
      axios.get<FloorOption[]>(`${BACKEND_URL}/floors`),
      axios.get<LocationRef[]>(`${BACKEND_URL}/locations`),
    ])
      .then(([t, f, l]) => { if (!ignore) { setTenants(t.data); setFloors(f.data); setLocations(l.data); setLoading(false); if (!mapFloor) { const gf = f.data.find(x => x.floorname === 'Ground Floor') ?? f.data[0]; if (gf) setMapFloor(gf.floorname); } } })
      .catch(() => { if (!ignore) { setLoading(false); } });
    return () => { ignore = true; };
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => setRefreshKey(k => k + 1);

  // Options for the add/edit form keep the curated list so a brand new category is
  // always selectable, not just the ones that already exist.
  const categoryOptions = Array.from(new Set([...TENANT_CATEGORIES, ...tenants.map(t => t.category).filter(Boolean)])).sort();
  // The filter only offers categories that actually have tenants, with live counts.
  const categoryFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tenants) {
      if (!t.category) continue;
      counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ value: label, label: `${label} (${count})` }));
  }, [tenants]);

  const query = search.trim().toLowerCase();
  const filtered = tenants.filter(t => {
    const matchSearch = !query || [t.name, t.category, t.location?.name ?? '', t.location?.floor?.floorname ?? '']
      .some(v => v.toLowerCase().includes(query));
    const matchCategory = !categoryFilter || t.category === categoryFilter;
    return matchSearch && matchCategory;
  });
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); setMapPage(1); };
  const handleCategoryFilterChange = (v: string) => { setCategoryFilter(v); setPage(1); setMapPage(1); };
  const hasActiveFilter = query !== '' || categoryFilter !== '';
  const clearFilters = () => { setSearch(''); setCategoryFilter(''); setPage(1); setMapPage(1); };
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  const openAdd = () => { setForm(emptyForm); setEditId(null); setLogoFile(null); setLogoPreview(''); setModalOpen(true); };
  const openAddAtLocation = (loc: LocationRef) => { setForm({ ...emptyForm, locationid: String(loc.id) }); setEditId(null); setLogoFile(null); setLogoPreview(''); setPopover(null); setModalOpen(true); };
  const openEdit = (t: TenantRow) => {
    setForm({ locationid: t.locationid ? String(t.locationid) : '', name: t.name, category: t.category, leaseUntil: toDateInput(t.leaseUntil) });
    setEditId(t.tenantid); setLogoFile(null); setLogoPreview(t.logoUrl ?? ''); setModalOpen(true);
  };
  const occupiedLocationIds = new Set(tenants.map(t => t.locationid).filter((v): v is number => v !== null));
  const locationOptions = locations
    .filter(l => !occupiedLocationIds.has(l.id) || String(l.id) === form.locationid)
    .map(l => ({ value: String(l.id), label: l.floor?.floorname ? `${l.name} — ${l.floor.floorname}` : l.name }));
  const handleDelete = async (t: TenantRow) => { if (!confirm(`Delete tenant "${t.name}"?`)) return; try { await axios.delete(`${BACKEND_URL}/tenants/${t.tenantid}`, { data: { meta: await buildMeta() } }); refresh(); toast('Tenant dihapus'); } catch { toast('Gagal hapus tenant'); } };
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (f) {
      setPendingCrop({ url: URL.createObjectURL(f), fileName: f.name });
      e.target.value = '';
    }
  };
  const handleCropApply = (file: File) => {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setPendingCrop(null);
  };
  const uploadLogo = async (): Promise<string | undefined> => { if (!logoFile) return undefined; const fd = new FormData(); fd.append('image', logoFile); const res = await axios.post<{ url: string }>(`${BACKEND_URL}/uploads/image`, fd); return res.data.url; };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); if (!form.locationid || !form.name || !form.category) return;
    try { let logoUrl: string | undefined; if (logoFile) logoUrl = await uploadLogo();
      const payload: Record<string, unknown> = { name: form.name, category: form.category, leaseUntil: form.leaseUntil || null, locationid: form.locationid ? Number(form.locationid) : null };
      if (logoUrl) payload.logoUrl = logoUrl;
      if (editId !== null) await axios.patch(`${BACKEND_URL}/tenants/${editId}`, payload); else await axios.post(`${BACKEND_URL}/tenants`, payload);
      setModalOpen(false); toast('Tenant disimpan'); refresh();
    } catch (err) { const m = axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Gagal simpan'; toast(m); }
  };

  // map helpers
  const getSvgCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current; if (!svg) return null; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const ctm = svg.getScreenCTM(); if (!ctm) return null; return pt.matrixTransform(ctm.inverse());
  }, []);
  const handleMapClick = (e: React.MouseEvent) => { if (e.target !== e.currentTarget) return; if (popover) setPopover(null); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tenantid = Number(e.dataTransfer.getData('text/plain'));
    if (!tenantid) return;
    const t = tenants.find(x => x.tenantid === tenantid); if (!t || !t.location) return;
    const c = getSvgCoords(e); if (!c) return;
    const x = Math.round(Math.max(0, Math.min(SVG_W, c.x))); const y = Math.round(Math.max(0, Math.min(SVG_H, c.y)));
    axios.patch(`${BACKEND_URL}/locations/${t.location.id}`, { x, y }).then(() => { toast(`Posisi unit ${locationLabel(t)} disimpan`); setSelectedForMap(t.tenantid); setSelectedId(t.tenantid); refresh(); }).catch(() => toast('Gagal menyimpan posisi'));
  };
  const handleMarkerClick = (loc: LocationRef, e: React.MouseEvent) => {
    e.stopPropagation();
    if (panRef.current || didPanRef.current) return;
    const tenant = tenants.find(x => x.locationid === loc.id) ?? null;
    const svg = svgRef.current; const wrap = mapWrapRef.current;
    if (!svg || !wrap) { setPopover({ loc, tenant, left: 16, top: 72 }); return; }
    const pt = svg.createSVGPoint(); pt.x = loc.x; pt.y = loc.y;
    const ctm = svg.getScreenCTM(); if (!ctm) { setPopover({ loc, tenant, left: 16, top: 72 }); return; }
    const screen = pt.matrixTransform(ctm);
    const rect = wrap.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.width - 250, screen.x - rect.left + 16));
    const top = Math.max(8, Math.min(rect.height - 160, screen.y - rect.top - 64));
    setPopover({ loc, tenant, left, top });
  };
  const handleDragStart = (t: TenantRow) => (e: React.DragEvent) => {
    if (!t.location) { e.preventDefault(); toast('Tenant ini belum punya unit/lokasi'); return; }
    e.dataTransfer.setData('text/plain', String(t.tenantid));
    e.dataTransfer.effectAllowed = 'move';
    setSelectedForMap(t.tenantid);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handlePanDown = (e: React.PointerEvent) => { panRef.current = { x: e.clientX - tx, y: e.clientY - ty }; setIsPanning(true); };
  const handlePanMove = (e: React.PointerEvent) => { if (!panRef.current) return; const nx = e.clientX - panRef.current.x; const ny = e.clientY - panRef.current.y; if (nx !== tx || ny !== ty) didPanRef.current = true; setTx(nx); setTy(ny); };
  const handlePanUp = () => { panRef.current = null; setIsPanning(false); setTimeout(() => { didPanRef.current = false; }, 0); };
  useEffect(() => { const el = svgRef.current; if (!el) return; const onWheel = (ev: WheelEvent) => { ev.preventDefault(); setScale(s => Math.min(4, Math.max(0.6, s * (ev.deltaY < 0 ? 1.1 : 0.9)))); }; el.addEventListener('wheel', onWheel, { passive: false }); return () => el.removeEventListener('wheel', onWheel); }, []);

  // Derive from `filtered` so the search + category filter also narrow the map,
  // not just the card and table views.
  const mapTenants = filtered.filter(t => {
    if (mapFloor) {
      const f = floors.find(x => x.floorname === mapFloor); if (f) return t.location?.floorid === f.floorid; return t.location?.floor?.floorname === mapFloor;
    } return true;
  });

  // All unit markers (occupied + vacant) for the currently selected floor.
  const mapLocations = locations.filter(l => {
    if (!l.x || !l.y) return false;
    if (mapFloor) {
      const f = floors.find(x => x.floorname === mapFloor); if (f) return l.floorid === f.floorid; return l.floor?.floorname === mapFloor;
    } return true;
  });
  const tenantByLocation = (locId: number) => tenants.find(t => t.locationid === locId);
  const isDraggable = (t: TenantRow) => !!t.location;
  const MAP_PAGE_SIZE = 10;
  const mapTotalPages = Math.max(1, Math.ceil(mapTenants.length / MAP_PAGE_SIZE));
  const curMapPage = Math.min(mapPage, mapTotalPages);
  const pagedMapTenants = mapTenants.slice((curMapPage - 1) * MAP_PAGE_SIZE, curMapPage * MAP_PAGE_SIZE);

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header data-actions-stack">
        <div>
          <h2 className="welcome-title"><Store size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Tenant Data</h2>
          <p className="welcome-text">Tenant directory — tarik kartu kecil ke denah untuk menandai lokasi unit, klik marker untuk lihat isi unit (bertenant / kosong).</p>
        </div>
        <div className="data-page-actions">
          <SearchBar value={search} onChange={handleSearchChange} placeholder="Search tenants..." />
          <Select
            value={categoryFilter}
            onChange={handleCategoryFilterChange}
            ariaLabel="Filter by category"
            options={[{ value: '', label: 'All Categories' }, ...categoryFilterOptions]}
          />
          {hasActiveFilter && (
            <button type="button" className="btn-cancel" onClick={clearFilters} style={{ padding: '0 12px', height: 36 }}>
              Clear
            </button>
          )}
          <button className="btn-add" onClick={openAdd}><Plus size={15} /> Add Tenant</button>
        </div>
      </div>

      {/* view toggles */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
          <button type="button" onClick={() => setViewMode('card')} className="btn-icon-action" style={{ width: 'auto', padding: '6px 10px', border: 'none', borderRadius: 0, background: viewMode === 'card' ? '#111' : 'transparent', color: viewMode === 'card' ? '#fff' : 'var(--text-secondary)' }} title="Card"><LayoutGrid size={15} /></button>
          <button type="button" onClick={() => setViewMode('map')} className="btn-icon-action" style={{ width: 'auto', padding: '6px 10px', border: 'none', borderRadius: 0, background: viewMode === 'map' ? '#111' : 'transparent', color: viewMode === 'map' ? '#fff' : 'var(--text-secondary)' }} title="Map"><MapIcon size={15} /></button>
        </div>
        {viewMode === 'map' && (
          <>
            <select className="filter-select" value={mapFloor} onChange={e => setMapFloor(e.target.value)}>
              <option value="">Semua Lantai</option>
              {floors.map(f => <option key={f.floorid} value={f.floorname}>{f.floorname}</option>)}
            </select>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{mapTenants.length} tenant pada lantai {mapFloor || 'semua'}</span>
          </>
        )}
        {viewMode === 'card' && (
          <span className="table-footer-info" style={{ marginLeft: 'auto' }}>{filtered.length} of {tenants.length} tenants</span>
        )}
      </div>

      {loading ? <p className="welcome-text">Loading...</p> : (
        <>
          {viewMode === 'card' && (
            <div className="data-scroll">
              {filtered.length === 0 ? <p className="welcome-text">{hasActiveFilter ? 'No tenants match the current search or category filter.' : 'No tenants.'}</p> : (
              <div className="data-grid">
                {paged.map(t => (
                  <article key={t.tenantid} className="data-card" style={{ outline: selectedForMap === t.tenantid ? '2px solid #2563eb' : undefined }}>
                    <div className="data-card-head">
                      {t.logoUrl ? <img src={t.logoUrl} alt={t.name} className="data-card-logo" /> : <span className="data-card-logo tenant-logo-empty"><Store size={20} /></span>}
                      <div><h3 className="data-card-name">{t.name}</h3><span className="data-card-unit">{locationLabel(t)}</span></div>
                    </div>
                    <div className="data-card-badges"><span className="status-badge outline">{t.category}</span>{t.location?.floor && <span className="status-badge solid">{t.location.floor.floorname}</span>}</div>
                    <div className="data-card-meta">
                      <div className="data-card-meta-row"><span className="data-card-meta-lbl">Rent / Month</span><span className="data-card-meta-val">{monthlyRent(t) ? formatRupiah(monthlyRent(t)) : '-'}</span></div>
                      <div className="data-card-meta-row"><span className="data-card-meta-lbl">Lease Until</span><span className="data-card-meta-val">{formatDate(t.leaseUntil)}</span></div>
                    </div>
                    <div className="data-card-actions">
                      <button className="btn-icon-action edit" onClick={() => openEdit(t)}><Pencil size={14} /></button>
                      <button className="btn-icon-action delete" onClick={() => handleDelete(t)}><Trash2 size={14} /></button>
                      <button className="btn-icon-action" onClick={() => { setSelectedForMap(t.tenantid); setViewMode('map'); }} title="Tentukan via Map" style={{ borderColor: selectedForMap === t.tenantid ? '#2563eb' : undefined, color: selectedForMap === t.tenantid ? '#2563eb' : undefined }}><MapIcon size={14} /></button>
                    </div>
                  </article>
                ))}
              </div>
              )}
            </div>
          )}

          {viewMode === 'card' && (
            <div className="table-footer">
              <span className="table-footer-info">
                Showing {filtered.length === 0 ? 0 : startIdx + 1}&ndash;{startIdx + paged.length} of {filtered.length} tenants
              </span>
              <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}

          {viewMode === 'map' && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
              {/* left: draggable tenant card list (10 per page) */}
              <div style={{ width: 340, flexShrink: 0, border: '1px solid var(--border-color)', borderRadius: 12, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '72vh' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: 12, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Tarik kartu ke denah</span>
                  <span className="status-badge outline">{mapTenants.length} tenant</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mapTenants.length === 0 ? <p className="welcome-text" style={{ fontSize: 12 }}>{hasActiveFilter ? 'Tidak ada tenant yang cocok dengan filter.' : 'Belum ada tenant.'}</p> : pagedMapTenants.map(t => (
                    <div
                      key={t.tenantid}
                      draggable={isDraggable(t)}
                      onDragStart={handleDragStart(t)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1.5px solid ${selectedForMap === t.tenantid ? '#2563eb' : 'var(--border-color)'}`, borderRadius: 12, padding: '10px', background: selectedForMap === t.tenantid ? '#eff6ff' : '#fff', cursor: isDraggable(t) ? 'grab' : 'not-allowed', boxShadow: 'var(--shadow-sm)' }}
                      onClick={() => { setSelectedForMap(t.tenantid); setSelectedId(t.tenantid); if (popover) setPopover(null); }}
                    >
                      {t.logoUrl ? <img src={t.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} /> : <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--sky-50)', color: 'var(--accent-color)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Store size={20} /></span>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isDraggable(t) ? locationLabel(t) : 'tanpa unit'}</div>
                        {t.category && <span className="status-badge outline" style={{ fontSize: 10, marginTop: 4, padding: '2px 6px' }}>{t.category}</span>}
                      </div>
                      <GripVertical size={16} style={{ color: isDraggable(t) ? 'var(--text-secondary)' : '#cbd5e1', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
                <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <button type="button" className="btn-icon-action" disabled={curMapPage <= 1} onClick={() => setMapPage(p => Math.max(1, p - 1))} style={{ padding: '4px 10px', fontSize: 12 }}>‹ Prev</button>
                  <span className="table-footer-info">{curMapPage}/{mapTotalPages}</span>
                  <button type="button" className="btn-icon-action" disabled={curMapPage >= mapTotalPages} onClick={() => setMapPage(p => Math.min(mapTotalPages, p + 1))} style={{ padding: '4px 10px', fontSize: 12 }}>Next ›</button>
                </div>
              </div>

              {/* right: the map canvas */}
              <div ref={mapWrapRef} style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', background: '#F8F6F3', height: '72vh', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600, flexWrap: 'wrap' }}><Crosshair size={12} />
                  <span>{mapFloor || 'Semua Lantai'}</span>
                  <span>{mapLocations.length} unit</span>
                  <span style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}><button type="button" className="btn-icon-action" onClick={() => setScale(s => Math.min(4, s * 1.2))}><ZoomIn size={12} /></button><button type="button" className="btn-icon-action" onClick={() => setScale(s => Math.max(0.6, s * 0.85))}><ZoomOut size={12} /></button><button type="button" className="btn-icon-action" onClick={() => { setScale(1); setTx(0); setTy(0); }}><RotateCcw size={12} /></button></span>
                </div>
                <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: '#2563eb', display: 'inline-block' }} /> Bertenant</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: '#e2e8f0', border: '2px dashed #94a3b8', display: 'inline-block' }} /> Kosong</span>
                </div>
                <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', cursor: isPanning ? 'grabbing' : 'crosshair', touchAction: 'none' }} onPointerDown={handlePanDown} onPointerMove={handlePanMove} onPointerUp={handlePanUp} onPointerLeave={handlePanUp} onDragOver={handleDragOver} onDrop={handleDrop}>
                  <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet" onClick={handleMapClick} style={{ width: '100%', height: '100%', display: 'block', transform: `translate(${tx}px,${ty}px) scale(${scale})`, transformOrigin: '0 0' }}>
                    <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#FBFBF8" />
                    <image href="/ground-floor.svg" x={0} y={0} width={SVG_W} height={SVG_H} preserveAspectRatio="xMidYMid meet" />
                    {mapLocations.map(loc => {
                      const tenant = tenantByLocation(loc.id);
                      const occupied = !!tenant;
                      const isSel = selectedId === loc.id;
                      const isHover = hoveredId === loc.id || (popover?.loc.id === loc.id);
                      const accent = isSel || isHover ? '#d97706' : '#2563eb';
                      return (
                        <g key={loc.id} transform={`translate(${loc.x} ${loc.y})`} onClick={e => handleMarkerClick(loc, e)} onPointerEnter={() => setHoveredId(loc.id)} onPointerLeave={() => setHoveredId(null)} style={{ cursor: 'pointer', pointerEvents: 'all' }}>
                          {/* card base */}
                          <rect x={-100} y={-50} width={200} height={100} rx={14} fill={occupied ? (isSel || isHover ? '#ffb020' : '#ffffff') : '#ffffff'} stroke={occupied ? accent : '#94a3b8'} strokeWidth={isSel || isHover ? 4 : 2.5} strokeDasharray={occupied ? undefined : '6 4'} />
                          {/* logo / initial */}
                          {occupied && tenant ? (
                            tenant.logoUrl ? (
                              <image href={tenant.logoUrl} x={-88} y={-40} width={80} height={80} preserveAspectRatio="xMidYMid slice" style={{ pointerEvents: 'none' }} />
                            ) : (
                              <rect x={-88} y={-40} width={80} height={80} rx={12} fill="#eff6ff" />
                            )
                          ) : (
                            <rect x={-88} y={-40} width={80} height={80} rx={12} fill="#f1f5f9" />
                          )}
                          {/* unit name */}
                          <text x={4} y={-28} textAnchor="start" fontSize={15} fontWeight={800} fill={isSel || isHover ? '#7c2d12' : '#475569'}>{loc.name.slice(0, 14)}</text>
                          {/* body text */}
                          {occupied && tenant ? (
                            <>
                              <text x={4} y={-4} textAnchor="start" fontSize={20} fontWeight={800} fill={isSel || isHover ? '#111' : '#0f172a'}>{tenant.name.slice(0, 9)}</text>
                              <text x={4} y={24} textAnchor="start" fontSize={12} fontWeight={700} fill="#94a3b8">{tenant.category?.slice(0, 18) ?? ''}</text>
                            </>
                          ) : (
                            <text x={4} y={-4} textAnchor="start" fontSize={18} fontWeight={700} fill="#94a3b8">Kosong</text>
                          )}
                        </g>
                      );
                    })}
                    {selectedForMap && (() => { const st = tenants.find(x => x.tenantid === selectedForMap); if (!st) return null; return <text x={SVG_W / 2} y={40} textAnchor="middle" fontSize={14} fontWeight={800} fill="#2563eb">Letakkan {st.location?.name ?? st.name} di denah (drop kartu ke titik yang dikehendaki)</text>; })()}
                  </svg>
                </div>
                <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(17,17,17,0.92)', color: '#fff', fontSize: 11, padding: '6px 10px', borderRadius: 8, fontFamily: 'monospace' }}>
                  Klik kartu untuk lihat isi unit (bertenant / kosong). Unit kosong bisa disewa.
                </div>

                {/* popup card beside the clicked marker */}
                {popover && (
                  <div style={{ position: 'absolute', left: popover.left, top: popover.top, zIndex: 20, width: 244, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: '0 18px 40px rgba(15,23,42,0.22)', overflow: 'hidden' }}>
                    <div style={{ padding: '4px 10px', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800 }}><MapPin size={12} />{popover.loc.name}</span>
                      <button type="button" className="btn-icon-action" onClick={() => setPopover(null)} style={{ border: 'none', color: '#fff', background: 'transparent', padding: 2 }}><X size={13} /></button>
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <span className="status-badge" style={{ background: popover.tenant ? '#dcfce7' : '#fef3c7', color: popover.tenant ? '#15803d' : '#b45309', fontWeight: 700 }}>
                          {popover.tenant ? 'Beritenan' : 'Kosong — belum ada tenant'}
                        </span>
                        {popover.loc.floor && <span className="status-badge outline">{popover.loc.floor.floorname}</span>}
                      </div>
                      {popover.tenant ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            {popover.tenant.logoUrl ? <img src={popover.tenant.logoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover' }} /> : <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--sky-50)', color: 'var(--accent-color)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Store size={14} /></span>}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{popover.tenant.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{popover.tenant.category}</div>
                            </div>
                          </div>
                          <div className="data-card-meta">
                            <div className="data-card-meta-row"><span className="data-card-meta-lbl">Rent / Month</span><span className="data-card-meta-val">{popover.tenant.location ? (monthlyRent(popover.tenant) ? formatRupiah(monthlyRent(popover.tenant)) : '-') : '-'}</span></div>
                            <div className="data-card-meta-row"><span className="data-card-meta-lbl">Lease Until</span><span className="data-card-meta-val">{formatDate(popover.tenant.leaseUntil)}</span></div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                            <button type="button" className="btn-icon-action edit" title="Edit" onClick={() => { setPopover(null); openEdit(popover.tenant as TenantRow); }}><Pencil size={14} /></button>
                            <button type="button" className="btn-icon-action delete" title="Hapus" onClick={() => { setPopover(null); handleDelete(popover.tenant as TenantRow); }}><Trash2 size={14} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, marginBottom: 8 }}>
                            Unit ini masih kosong dan siap disewa. Isi nama tenant untuk mengisi unit ini.
                          </p>
                          <button type="button" className="btn-secondary" style={{ width: '100%', padding: '7px 10px', fontSize: 12 }} onClick={() => openAddAtLocation(popover.loc)}><Plus size={12} /> Sewa Unit Ini</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <Modal title={editId !== null ? `Edit Tenant ${locations.find(l => String(l.id) === form.locationid)?.name ?? ''}`.trim() : 'Add Tenant'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Tenant Logo</label><div className="logo-upload-row">{logoPreview ? <img src={logoPreview} alt="preview" className="tenant-logo-preview" /> : <span className="tenant-logo-preview placeholder"><Store size={20} /></span>}<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoChange} className="file-input" /></div></div>
            <div className="form-group"><label className="form-label">Location (Unit)</label><Select value={form.locationid} onChange={v => setForm({ ...form, locationid: v })} ariaLabel="Select location" options={[{ value: '', label: '- Select Location -' }, ...locationOptions]} /></div>
            <div className="form-group"><label className="form-label">Tenant Name</label><input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Category</label><Select value={form.category} onChange={v => setForm({ ...form, category: v })} ariaLabel="Select category" options={[{ value: '', label: '- Select Category -' }, ...categoryOptions.map(c => ({ value: c, label: c }))]} /></div>
            <div className="form-group"><label className="form-label">Lease End Date</label><input type="date" className="form-input" value={form.leaseUntil} onChange={e => setForm({ ...form, leaseUntil: e.target.value })} /></div>
            <div className="modal-actions"><button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn-secondary">Save</button></div>
          </form>
        </Modal>
      )}
      {pendingCrop && (
        <ImageCropModal
          imageUrl={pendingCrop.url}
          fileName={pendingCrop.fileName}
          onCancel={() => setPendingCrop(null)}
          onApply={handleCropApply}
        />
      )}
    </div>
  );
}
export default TenantDataView;
