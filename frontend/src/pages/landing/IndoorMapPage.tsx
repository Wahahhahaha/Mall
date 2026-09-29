import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Search } from 'lucide-react';
import Reveal from '../../components/Reveal';
import axios from 'axios';
import { BACKEND_URL } from '../../config';
import PathpalIndoorMap from '../dashboard/views/pathpal/PathpalIndoorMap';
import { resolvePlanFloor } from './mallData';

interface LocationItem {
  id: number;
  name: string;
  floorid: number | null;
  floor?: { floorid: number; floorname: string; floorcode: string | null } | null;
  tenants?: { tenantid: number; name: string }[];
  x: number;
  y: number;
}

const SVG_W = 5016;
const SVG_H = 5016;

const FALLBACK_FLOORS = ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3'];

function floorBtnLabel(f: string) {
  if (f === 'Ground Floor') return 'GF';
  const m = f.match(/^Floor (\d+)$/);
  if (m) return `${m[1]}F`;
  return f.slice(0, 2).toUpperCase();
}

const FLOOR_PALETTE = ['#2563eb', '#7c3aed', '#0f766e', '#ea580c', '#0284c7', '#ca8a04', '#16a34a', '#dc2626'];
function getColor(floorid: number | null, floorList: Array<{ floorid: number }>) {
  const idx = floorList.findIndex((f) => f.floorid === floorid);
  return idx < 0 ? '#161616' : FLOOR_PALETTE[idx % FLOOR_PALETTE.length];
}

function IndoorMapPage() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [mapFloor, setMapFloor] = useState('Ground Floor');
  const [dbFloors, setDbFloors] = useState<Array<{ floorid: number; floorname: string }>>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    axios.get<LocationItem[]>(`${BACKEND_URL}/locations`).then((r) => setLocations(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    axios
      .get<Array<{ floorid: number; floorname: string }>>(`${BACKEND_URL}/floors`)
      .then((r) => {
        if (r.data.length) setDbFloors(r.data);
      })
      .catch(() => {});
  }, []);

  const floorList = dbFloors.length
    ? dbFloors
    : FALLBACK_FLOORS.map((floorname, i) => ({ floorid: i + 1, floorname }));

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(4, Math.max(0.7, s * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // pan handlers (simple drag background)
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.nav-marker')) return;
    panRef.current = { x: e.clientX - tx, y: e.clientY - ty };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!panRef.current) return;
    setTx(e.clientX - panRef.current.x);
    setTy(e.clientY - panRef.current.y);
  };
  const onPointerUp = () => {
    panRef.current = null;
  };

  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const filtered = locations.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || (l.floor?.floorname ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <section className="landing-section">
      <Reveal stagger>
        <button type="button" className="map-back" onClick={() => navigate('/tenant-directory')}>
          <ArrowLeft size={14} /> Back to Tenant Directory
        </button>
        <h1 className="landing-section-title">Navigation Map — {mapFloor}</h1>
        <p className="landing-section-sub">
          Denah interaktif — {mapFloor === 'Ground Floor' ? 'menggunakan SVG asli (5016×5016)' : 'menggunakan denah per lantai'}. Klik marker atau daftar di bawah untuk melihat detail lokasi. Gunakan scroll untuk zoom dan drag untuk geser denah.
        </p>

        {/* floor selector (order follows DB — diatur di /dashboard/floor-data) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 8 }}>
          {floorList.map(({ floorname: f }) => {
            const active = mapFloor === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setMapFloor(f);
                  setScale(1);
                  setTx(0);
                  setTy(0);
                }}
                style={{
                  border: 'none',
                  background: active ? '#111' : 'var(--card-bg)',
                  color: active ? '#fff' : '#88898c',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {floorBtnLabel(f)}
              </button>
            );
          })}
        </div>

        {/* filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, color: '#888' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari lokasi, kategori..."
              style={{
                padding: '8px 12px 8px 30px',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                fontSize: 13,
                minWidth: 220,
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{filtered.length} lokasi</span>
          {selected && (
            <span className="status-badge solid" style={{ marginLeft: 'auto', background: getColor(selected.floorid, floorList) }}>
              <MapPin size={12} /> {selected.name} — x:{Math.round(selected.x)} y:{Math.round(selected.y)}
            </span>
          )}
        </div>

        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#F8F6F3',
            height: '68vh',
            minHeight: 480,
            position: 'relative',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {resolvePlanFloor(mapFloor) === 'Ground Floor' ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="xMidYMid meet"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                  transformOrigin: '0 0',
                }}
              >
                <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#FBFBF8" />
                <image href="/ground-floor.svg" x={0} y={0} width={SVG_W} height={SVG_H} preserveAspectRatio="xMidYMid meet" />
                {filtered.map((loc) => {
                  const isSel = selectedId === loc.id;
                  const color = getColor(loc.floorid, floorList);
                  return (
                    <g
                      key={loc.id}
                      className="nav-marker"
                      transform={`translate(${loc.x} ${loc.y})`}
                      onClick={() => setSelectedId(loc.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {isSel && <circle r={24} fill={color} opacity={0.15} />}
                      <circle r={isSel ? 14 : 11} fill={color} stroke="#fff" strokeWidth={2.5} />
                      <text y={4} textAnchor="middle" fontSize={9} fontWeight={800} fill="#fff" pointerEvents="none">
                        {loc.name[0]?.toUpperCase() ?? '•'}
                      </text>
                      <g pointerEvents="none">
                        <rect x={16} y={-9} width={Math.max(56, loc.name.length * 5 + 10)} height={18} rx={6} fill={isSel ? '#111' : 'rgba(17,17,17,0.88)'} />
                        <text x={21} y={2.2} fontSize={8.2} fontWeight={700} fill="#fff">
                          {loc.name}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
              {selected && (
                <div
                  style={{
                    position: 'absolute',
                    left: 12,
                    bottom: 12,
                    background: '#fff',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    padding: 14,
                    minWidth: 260,
                    maxWidth: 360,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 14 }}>{selected.name}</strong>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span className="status-badge solid" style={{ background: getColor(selected.floorid, floorList) }}>{selected.floor?.floorname ?? '—'}</span>
                    {selected.tenants && selected.tenants.length > 0 && (
                      <span className="status-badge outline">{selected.tenants[0].name}</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#666' }}>
                    x: {Math.round(selected.x)} &nbsp; y: {Math.round(selected.y)} &nbsp; · Ground Floor SVG 5016×5016
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="pathpal-fill" style={{ width: '100%', height: '100%' }}>
              <PathpalIndoorMap floor={mapFloor} activeUnit="" onSelectUnit={() => {}} showUserDot={false} />
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'flex',
              gap: 6,
            }}
          >
            <button
              type="button"
              className="btn-icon-action"
              style={{ background: '#fff' }}
              onClick={() => setScale((s) => Math.min(4, s * 1.2))}
            >
              +
            </button>
            <button type="button" className="btn-icon-action" style={{ background: '#fff' }} onClick={() => setScale((s) => Math.max(0.7, s * 0.85))}>
              −
            </button>
            <button type="button" className="btn-icon-action" style={{ background: '#fff' }} onClick={() => { setScale(1); setTx(0); setTy(0); }}>
              ⟲
            </button>
          </div>
        </div>

        {/* list below for navigation */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {filtered.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setSelectedId(loc.id)}
              style={{
                textAlign: 'left',
                padding: 14,
                borderRadius: 12,
                border: selectedId === loc.id ? `2px solid ${getColor(loc.floorid, floorList)}` : '1px solid var(--border-color)',
                background: selectedId === loc.id ? `${getColor(loc.floorid, floorList)}0c` : 'var(--card-bg)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: getColor(loc.floorid, floorList), display: 'inline-block' }} />
                <strong style={{ fontSize: 13 }}>{loc.name}</strong>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span>{loc.floor?.floorname ?? '—'}</span> · <span>{loc.tenants && loc.tenants.length > 0 ? loc.tenants[0].name : 'kosong'}</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', marginTop: 4 }}>
                x:{Math.round(loc.x)} y:{Math.round(loc.y)}
              </div>
            </button>
          ))}
        </div>
        {filtered.length === 0 && <div className="landing-empty" style={{ marginTop: 16 }}>Belum ada lokasi untuk kategori ini.</div>}
      </Reveal>
    </section>
  );
}

export default IndoorMapPage;
