import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { MapPin, Trash2, Pencil, Save, X, Plus, ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
import { BACKEND_URL } from '../../../config';
import { buildMeta } from '../../../utils/meta';
import { toast } from '../../../components/toastBus';
import Modal from '../../../components/Modal';
import SearchBar from '../../../components/SearchBar';
import Pagination from '../../../components/Pagination';
import { useConfirm } from '../../../components/ConfirmDialog';
import PathpalIndoorMap from './pathpal/PathpalIndoorMap';
import { resolvePlanFloor } from '../../landing/mallData';

interface LocationItem {
  id: number;
  name: string;
  floorid: number | null;
  floor?: { floorid: number; floorname: string; floorcode: string | null } | null;
  tenants?: { tenantid: number; name: string }[];
  x: number;
  y: number;
  createdAt: string;
}

interface FloorOption {
  floorid: number;
  floorname: string;
  floorcode: string | null;
}

const FLOORS = ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3'];

const floorBtnLabel = (fl: FloorOption): string => {
  if (fl.floorcode) return fl.floorcode;
  if (fl.floorname === 'Ground Floor') return 'GF';
  return `${fl.floorname.charAt(0).toUpperCase()}F`;
};

const SVG_W = 5016;
const SVG_H = 5016;

const FLOOR_PALETTE = ['#2563eb', '#7c3aed', '#0f766e', '#ea580c', '#0284c7', '#ca8a04', '#16a34a', '#dc2626'];

function getFloorColor(floorid: number | null, palette: FloorOption[]) {
  const idx = palette.findIndex((f) => f.floorid === floorid);
  return idx < 0 ? '#161616' : FLOOR_PALETTE[idx % FLOOR_PALETTE.length];
}

export default function LocationEditor({ mapOnly = false }: { mapOnly?: boolean }) {
  const { askConfirm, confirmDialog } = useConfirm();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LocationItem | null>(null);
  const [draftCoords, setDraftCoords] = useState<{ x: number; y: number } | null>(null);
  const [form, setForm] = useState({ name: '', floorid: '' });

  // map interaction
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [mapFloor, setMapFloor] = useState<number | null>(null);
  const [dbFloors, setDbFloors] = useState<FloorOption[]>([]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await axios.get<LocationItem[]>(`${BACKEND_URL}/locations`);
      setLocations(res.data);
    } catch {
      toast('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  const floorOptions: FloorOption[] = dbFloors.length
    ? dbFloors
    : FLOORS.map((floorname, i) => ({ floorid: i + 1, floorname, floorcode: null }));
  // mapOnly shows a single floor plan, so default to the first floor;
  // the dashboard editor keeps "All Floors" until the user picks one
  const activeFloor = mapFloor ?? (mapOnly ? (floorOptions[0]?.floorid ?? null) : null);
  const mapFloorName = floorOptions.find((f) => f.floorid === activeFloor)?.floorname ?? '';

  useEffect(() => {
    axios.get<FloorOption[]>(`${BACKEND_URL}/floors`).then((r) => setDbFloors(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const defaultFloorId = () => String(activeFloor ?? floorOptions[0]?.floorid ?? '');

  const resetForm = () => {
    setForm({ name: '', floorid: defaultFloorId() });
    setDraftCoords(null);
    setEditing(null);
  };

  const openCreateForm = (coords: { x: number; y: number }) => {
    setEditing(null);
    setDraftCoords(coords);
    setForm({ name: '', floorid: defaultFloorId() });
    setShowForm(true);
  };

  const openEditForm = (loc: LocationItem) => {
    setEditing(loc);
    setDraftCoords({ x: loc.x, y: loc.y });
    setForm({ name: loc.name, floorid: loc.floorid ? String(loc.floorid) : '' });
    setShowForm(true);
    setSelectedId(loc.id);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Location name is required');
      return;
    }
    if (!draftCoords) {
      toast('Coordinates not selected — click the floor plan');
      return;
    }
    const payload = {
      name: form.name.trim(),
      floorid: form.floorid ? Number(form.floorid) : null,
      x: Math.round(draftCoords.x),
      y: Math.round(draftCoords.y),
    };
    try {
      if (editing) {
        const res = await axios.patch<LocationItem>(`${BACKEND_URL}/locations/${editing.id}`, payload);
        setLocations((prev) => prev.map((l) => (l.id === editing.id ? res.data : l)));
        toast('Location updated');
      } else {
        const res = await axios.post<LocationItem>(`${BACKEND_URL}/locations`, payload);
        setLocations((prev) => [...prev, res.data]);
        toast('Location saved');
        setSelectedId(res.data.id);
      }
      setShowForm(false);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast(msg);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${BACKEND_URL}/locations/${id}`, {
        data: { meta: await buildMeta() },
      });
      setLocations((prev) => prev.filter((l) => l.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast('Location deleted');
    } catch {
      toast('Failed to delete location');
    }
  };

  const askDelete = (id: number, name: string) => {
    askConfirm({
      title: 'Delete Location',
      message: <>Delete location <strong>{name}</strong>? This marker will be removed from the indoor map.</>,
      confirmLabel: 'Delete',
      onConfirm: () => handleDelete(id),
    });
  };

  // SVG coordinate conversion
  const getSvgCoords = (e: React.MouseEvent | MouseEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  };

  const handleMapClick = (e: React.MouseEvent) => {
    // ignore if dragging marker or panning
    if (dragRef.current || panRef.current) return;
    // ignore if clicked on marker (marker stops propagation)
    const coords = getSvgCoords(e);
    if (!coords) return;
    // clamp to svg bounds
    const x = Math.max(0, Math.min(SVG_W, coords.x));
    const y = Math.max(0, Math.min(SVG_H, coords.y));
    openCreateForm({ x, y });
  };

  const handleMarkerPointerDown = (e: React.PointerEvent, loc: LocationItem) => {
    e.stopPropagation();
    setSelectedId(loc.id);
    const coords = getSvgCoords(e);
    if (!coords) return;
    dragRef.current = { id: loc.id, offsetX: coords.x - loc.x, offsetY: coords.y - loc.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleMarkerPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    const { id, offsetX, offsetY } = dragRef.current;
    const nx = Math.max(0, Math.min(SVG_W, coords.x - offsetX));
    const ny = Math.max(0, Math.min(SVG_H, coords.y - offsetY));
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, x: nx, y: ny } : l)));
    // also update draft coords if editing same id
    if (editing && editing.id === id) setDraftCoords({ x: nx, y: ny });
  };

  const handleMarkerPointerUp = async (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const id = dragRef.current.id;
    (e.target as Element).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    const loc = locations.find((l) => l.id === id);
    if (!loc) return;
    try {
      await axios.patch(`${BACKEND_URL}/locations/${id}`, { x: Math.round(loc.x), y: Math.round(loc.y) });
      toast(`Position of ${loc.name} updated`);
    } catch {
      toast('Failed to save position');
      fetchLocations();
    }
  };

  // Pan handling (drag background)
  const handleSvgPointerDown = (e: React.PointerEvent) => {
    // only pan if not clicking marker and with middle or left drag + shift? simple: pan when dragging empty area
    // we already handle map click; pan starts on pointer down without marker
    if ((e.target as Element).closest('.loc-marker')) return;
    panRef.current = { x: e.clientX - tx, y: e.clientY - ty };
    setIsPanning(true);
  };
  const handleSvgPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      handleMarkerPointerMove(e);
      return;
    }
    if (!panRef.current) return;
    setTx(e.clientX - panRef.current.x);
    setTy(e.clientY - panRef.current.y);
  };
  const handleSvgPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      handleMarkerPointerUp(e);
    }
    panRef.current = null;
    setIsPanning(false);
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      setScale((s) => Math.min(4, Math.max(0.6, s * delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const filtered = locations.filter((l) => {
    if (activeFloor !== null && l.floorid !== activeFloor) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        (l.floor?.floorname ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const pageItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFloor]);

  const focusMarker = (id: number) => {
    setSelectedId(id);
    const loc = locations.find((l) => l.id === id);
    if (!loc || !containerRef.current || !svgRef.current) return;
    // center marker in view: compute transform to center
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    // approximate: tx = rect.width/2 - (loc.x/ SVG_W * renderedWidth * scale ) ; but simpler animate scale reset and highlight
    // just scroll container into view and highlight
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // optional: center via tx/ty
    // compute scale-adjusted centering
    try {
      // convert svg coords to screen
      const pt = svgRef.current.createSVGPoint();
      pt.x = loc.x;
      pt.y = loc.y;
      const ctm = svgRef.current.getScreenCTM();
      if (ctm) {
        const screen = pt.matrixTransform(ctm);
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;
        setTx((prev) => prev + (targetX - screen.x));
        setTy((prev) => prev + (targetY - screen.y));
        setScale(1.6);
        setTimeout(() => setScale(1.4), 1500);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      {!mapOnly && (
        <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 className="welcome-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={20} /> Location Editor — Ground Floor
          </h2>
          <p className="welcome-text" style={{ maxWidth: 640 }}>
            Click the floor plan to create a new marker. The <b>x y</b> coordinates are filled automatically based on the click position. Drag a marker to move it. Click a marker to edit it. The plan uses the original SVG <code>ground-floor.svg</code> (5016×5016) filling the editor area.
          </p>
        </div>
        <button
          type="button"
          className="btn-add"
          onClick={() => toast('Click the floor plan to create a new location — coordinates are filled automatically')}
        >
          <Plus size={14} /> Guide
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search location or floor..." />
        <select className="filter-select" value={activeFloor ?? ''} onChange={(e) => setMapFloor(e.target.value ? Number(e.target.value) : null)}>
          <option value="">All Floors</option>
          {floorOptions.map((fl) => (
            <option key={fl.floorid} value={fl.floorid}>
              {fl.floorname}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {filtered.length} locations • Click plan → new marker • Drag marker → move
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button type="button" className="btn-icon-action" onClick={() => setScale((s) => Math.min(4, s * 1.2))} title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button type="button" className="btn-icon-action" onClick={() => setScale((s) => Math.max(0.6, s * 0.85))} title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            className="btn-icon-action"
            onClick={() => {
              setScale(1);
              setTx(0);
              setTy(0);
            }}
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
        </>
      )}

      {/* Map Area — floor plan fills the editor */}
      <div
        ref={containerRef}
        className="location-editor-shell"
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#F8F6F3',
          height: mapOnly ? 'calc(100vh - 128px)' : '68vh',
          minHeight: 520,
          position: 'relative',
}}
        >
          {mapOnly && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 7,
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                background: 'rgba(255,255,255,0.94)',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                padding: 5,
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              }}
            >
              {floorOptions.map((fl) => {
                const active = activeFloor === fl.floorid;
                return (
                  <button
                    key={fl.floorid}
                    type="button"
                    onClick={() => {
                      setMapFloor(fl.floorid);
                      setScale(1);
                      setTx(0);
                      setTy(0);
                    }}
                    style={{
                      border: 'none',
                      background: active ? '#111' : 'transparent',
                      color: active ? '#fff' : '#88898c',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 11px',
                      borderRadius: 7,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {floorBtnLabel(fl)}
                  </button>
                );
              })}
            </div>
          )}

          {mapOnly && mapFloorName && resolvePlanFloor(mapFloorName) !== 'Ground Floor' ? (
            <div className="pathpal-fill" style={{ width: '100%', height: '100%' }}>
              <PathpalIndoorMap floor={mapFloorName} activeUnit="" onSelectUnit={() => {}} showUserDot={false} />
            </div>
          ) : (
            <>
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 5,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Crosshair size={12} /> Ground Floor — SVG 5016×5016 — Click to add • Drag to move
          <span style={{ opacity: 0.6, marginLeft: 6 }}>| Scale: {scale.toFixed(2)}x</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            Loading floor plan...
          </div>
        ) : (
          <div
            className="location-map-canvas"
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              cursor: isPanning ? 'grabbing' : 'crosshair',
              touchAction: 'none',
            }}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onPointerLeave={handleSvgPointerUp}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="xMidYMid meet"
              onClick={handleMapClick}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
            >
              {/* Background */}
              <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#FBFBF8" />
              {/* Floor plan image */}
              <image href="/ground-floor.svg" x={0} y={0} width={SVG_W} height={SVG_H} preserveAspectRatio="xMidYMid meet" />

              {/* Markers */}
              {filtered.map((loc) => {
                const isSelected = selectedId === loc.id;
                const isHover = hoverId === loc.id;
                const color = getFloorColor(loc.floorid, floorOptions);
                return (
                  <g
                    key={loc.id}
                    className="loc-marker"
                    transform={`translate(${loc.x} ${loc.y})`}
                    onPointerDown={(e) => handleMarkerPointerDown(e, loc)}
                    onPointerMove={handleMarkerPointerMove}
                    onPointerUp={handleMarkerPointerUp}
                    onMouseEnter={() => setHoverId(loc.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(loc.id);
                      openEditForm(loc);
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    {/* pulse for selected */}
                    {isSelected && <circle r={22} fill={color} opacity={0.14} />}
                    {isHover && !isSelected && <circle r={18} fill={color} opacity={0.1} />}
                    <circle r={13} fill={color} stroke="#fff" strokeWidth={2.5} />
                    <text y={4.5} textAnchor="middle" fontSize={9} fontWeight={800} fill="#fff" pointerEvents="none">
                      {loc.name[0]?.toUpperCase() ?? '•'}
                    </text>
                    {/* label */}
                    <g pointerEvents="none">
                      <rect
                        x={18}
                        y={-10}
                        width={Math.max(64, loc.name.length * 5.5 + 12)}
                        height={20}
                        rx={6}
                        fill={isSelected ? '#111' : 'rgba(17,17,17,0.92)'}
                      />
                      <text x={24} y={2.5} fontSize={8.5} fontWeight={700} fill="#fff">
                        {loc.name}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Draft marker preview */}
              {draftCoords && !editing && showForm && (
                <g transform={`translate(${draftCoords.x} ${draftCoords.y})`} pointerEvents="none" opacity={0.95}>
                  <circle r={16} fill="#2563eb" opacity={0.18} />
                  <circle r={11} fill="#2563eb" stroke="#fff" strokeWidth={2.5} />
                  <text y={4} textAnchor="middle" fontSize={9} fontWeight={800} fill="#fff">
                    +
                  </text>
                </g>
              )}

              {/* coords grid hint */}
              <text x={SVG_W - 12} y={SVG_H - 10} textAnchor="end" fontSize={11} fill="#9a9590" fontFamily="monospace">
                {SVG_W} × {SVG_H} — local coords
              </text>
            </svg>
          </div>
        )}

        {/* coords legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            right: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              background: 'rgba(17,17,17,0.92)',
              color: '#fff',
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 8,
              fontFamily: 'monospace',
            }}
          >
            {selectedId
              ? (() => {
                  const s = locations.find((l) => l.id === selectedId);
                  return s ? `${s.name} → x:${Math.round(s.x)} y:${Math.round(s.y)} · ${s.floor?.floorname ?? 'no floor'}` : 'Select marker';
                })()
              : 'Click plan → create marker • Click marker → edit • Drag marker → move'}
          </span>
          <span
            style={{
              background: '#fff',
              border: '1px solid var(--border-color)',
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            {locations.length} total • {filtered.length} shown
          </span>
        </div>
            </>
          )}
      </div>

      {/* Form Modal */}
      {!mapOnly && (
        <>
      {showForm && (
        <Modal
          title={editing ? `Edit Location — x:${Math.round(draftCoords?.x ?? 0)} y:${Math.round(draftCoords?.y ?? 0)}` : `Add Location — x:${Math.round(draftCoords?.x ?? 0)} y:${Math.round(draftCoords?.y ?? 0)}`}
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Location Name *</label>
              <input
                className="form-input"
                style={{ paddingLeft: 14 }}
                placeholder="e.g. GF-10 / Lab Komputer 1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="two-col-grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Floor *</label>
                <select
                  className="form-input"
                  style={{ paddingLeft: 14 }}
                  value={form.floorid}
                  onChange={(e) => setForm({ ...form, floorid: e.target.value })}
                >
                  <option value="">- Select Floor -</option>
                  {floorOptions.map((fl) => (
                    <option key={fl.floorid} value={fl.floorid}>
                      {fl.floorname}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Local Coordinates (automatic)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="form-input" style={{ paddingLeft: 14 }} value={`x: ${Math.round(draftCoords?.x ?? 0)}`} readOnly />
                  <input className="form-input" style={{ paddingLeft: 14 }} value={`y: ${Math.round(draftCoords?.y ?? 0)}`} readOnly />
                </div>
                <span className="form-hint">Updates when a marker is dragged or the plan is clicked again</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <X size={14} /> Cancel
              </button>
              <button type="button" className="btn-secondary" onClick={handleSave}>
                <Save size={14} /> {editing ? 'Update' : 'Save to MySQL'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CRUD Table */}
      <div className="panel-scroll" style={{ marginTop: 20, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>Location List ({filtered.length})</h3>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Click a row to focus the marker on the map</span>
        </div>

        {pageItems.length === 0 ? (
          <div className="landing-empty">No locations yet. Click the floor plan to create the first marker.</div>
        ) : (
          <>
            <div className="data-scroll">
            <div className="table-container" style={{ marginTop: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location Name</th>
                    <th>Floor</th>
                    <th>Tenant</th>
                    <th>Coordinates</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((loc) => (
                    <tr
                      key={loc.id}
                      onClick={() => focusMarker(loc.id)}
                      style={{
                        cursor: 'pointer',
                        background: selectedId === loc.id ? 'rgba(37,99,235,0.06)' : undefined,
                        outline: selectedId === loc.id ? '1px solid rgba(37,99,235,0.18)' : undefined,
                      }}
                    >
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: getFloorColor(loc.floorid, floorOptions),
                              display: 'inline-block',
                              boxShadow: selectedId === loc.id ? `0 0 0 4px ${getFloorColor(loc.floorid, floorOptions)}22` : undefined,
                            }}
                          />
                          {loc.name}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge solid" style={{ background: loc.floorid === 1 ? '#111' : '#3f3f46' }}>
                          {loc.floor?.floorname ?? '—'}
                        </span>
                      </td>
                      <td>
                        {loc.tenants && loc.tenants.length > 0 ? (
                          <span className="status-badge outline">{loc.tenants[0].name}</span>
                        ) : (
                          <span style={{ opacity: 0.5 }}>— kosong</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        x:{Math.round(loc.x)} y:{Math.round(loc.y)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <span className="row-actions">
                          <button type="button" className="btn-icon-action edit" onClick={() => openEditForm(loc)} title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button type="button" className="btn-icon-action delete" onClick={() => askDelete(loc.id, loc.name)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            <div className="table-footer">
              <span className="table-footer-info">
                Showing {pageItems.length} of {filtered.length} locations
              </span>
              <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </div>
        </>
      )}

      {confirmDialog}
    </div>
  );
}
