import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../config';
import { toast } from '../../components/toastBus';
import { Store, MapPin, Search, Wallet, Calendar, CreditCard, User, Phone, FileText, Clock, LayoutGrid, Map as MapIcon, Crosshair, ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';
import Modal from '../../components/Modal';

interface UnitAvail {
  id: number;
  name: string;
  x: number;
  y: number;
  pricePerYear: number | null;
  minLeaseYears: number;
  monthlyFee: number;
  floor?: { floorname: string; floorcode: string | null } | null;
}
const unitCode = (u: UnitAvail) => u.name;
const unitSub = (u: UnitAvail) => u.floor?.floorcode || u.floor?.floorname || 'Unit';

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const MIN_DURATION = 12;
const MAX_DURATION = 120;
const CATEGORIES = ['Retail', 'F&B', 'Fashion', 'Services', 'Health & Pharmacy', 'Electronics', 'Education', 'Other'];
const SVG_W = 5016; const SVG_H = 5016;

export default function BrowseUnits() {
  const [units, setUnits] = useState<UnitAvail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('all');
  const [selected, setSelected] = useState<UnitAvail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);

  // form state
  const [duration, setDuration] = useState(MIN_DURATION);
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Retail');
  const [customCategory, setCustomCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [contractStart, setContractStart] = useState(new Date().toISOString().slice(0, 10));

  // map
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1); const [tx, setTx] = useState(0); const [ty, setTy] = useState(0);
  const panRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await axios.get<UnitAvail[]>(`${BACKEND_URL}/tenant-requests/available`);
        if (active) setUnits(res.data);
      } catch {
        if (active) toast('Failed to load vacant units');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const floors = [...new Set(units.map(u => u.floor?.floorname).filter((f): f is string => !!f))];
  const filtered = units.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.name} ${u.floor?.floorname ?? ''} ${u.floor?.floorcode ?? ''}`.toLowerCase().includes(q);
    const matchFloor = floorFilter === 'all' || u.floor?.floorname === floorFilter;
    return matchSearch && matchFloor;
  });

  const openRequest = (u: UnitAvail) => {
    setSelected(u);
    setBusinessName('');
    setBusinessCategory('Retail');
    setCustomCategory('');
    setDuration(MIN_DURATION);
    setPhone('');
    setDescription('');
    setPersonInCharge('');
    setContractStart(new Date().toISOString().slice(0,10));
    setFormOpen(true);
  };

  const selectedFee = selected?.monthlyFee ?? 0;
  const total = Math.round(selectedFee * duration);
  const durationInvalid = duration < MIN_DURATION || duration > MAX_DURATION;

  const handleSubmit = async () => {
    if (!selected) return;
    const raw = localStorage.getItem('user');
    if (!raw) { toast('Session expired, please sign in again'); return; }
    const user = JSON.parse(raw);
    if (!businessName.trim()) { toast('Business name is required'); return; }
    if (!phone.trim()) { toast('Phone number is required'); return; }
    const category = businessCategory === 'Other' ? customCategory.trim() : businessCategory;
    if (!category) { toast('Business category is required'); return; }
    if (durationInvalid) { toast(`Contract duration must be ${MIN_DURATION}–${MAX_DURATION} months`); return; }
    try {
      await axios.post(`${BACKEND_URL}/tenant-requests`, {
        userid: user.userid,
        locationid: selected.id,
        durationMonths: duration,
        businessName: businessName.trim(),
        businessCategory: category,
        description: description.trim() ? `${personInCharge.trim() ? 'PIC: ' + personInCharge.trim() + ' | ' : ''}${description.trim()}` : (personInCharge.trim() ? 'PIC: ' + personInCharge.trim() : undefined),
        phone: phone.trim(),
        contractStart,
      });
      toast(`Request for ${unitCode(selected)} submitted — total ${formatRupiah(total)}`);
      setFormOpen(false);
      setSelected(null);
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) && e.response?.data?.message ? String(e.response.data.message) : 'Failed to submit request';
      toast(msg);
    }
  };

  // map helpers
  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setScale(s => Math.min(4, Math.max(0.6, s * (e.deltaY < 0 ? 1.1 : 0.9)))); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [viewMode]);
  const handlePanDown = (e: React.PointerEvent) => { if ((e.target as Element).closest('.tenant-map-marker')) return; panRef.current = { x: e.clientX - tx, y: e.clientY - ty }; };
  const handlePanMove = (e: React.PointerEvent) => { if (!panRef.current) return; setTx(e.clientX - panRef.current.x); setTy(e.clientY - panRef.current.y); };
  const handlePanUp = () => { panRef.current = null; };

  const focusUnit = (id: number) => {
    setSelectedMapId(id);
    const u = units.find(x => x.id === id);
    if (!u || !svgRef.current) return;
    // center
    try {
      const pt = svgRef.current.createSVGPoint(); pt.x = u.x; pt.y = u.y;
      const ctm = svgRef.current.getScreenCTM();
      if (ctm) {
        const svgRect = svgRef.current.getBoundingClientRect();
        const screen = pt.matrixTransform(ctm);
        const targetX = svgRect.left + svgRect.width / 2;
        const targetY = svgRect.top + svgRect.height / 2;
        setTx(v => v + (targetX - screen.x));
        setTy(v => v + (targetY - screen.y));
        setScale(1.4);
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="tenant-page">
      <div className="tenant-toolbar">
        <div className="tenant-toolbar-left">
          <div className="search-bar tenant-search">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder="Search unit, category, floor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="tenant-floor-filter">
            <Layers size={14} />
            <select value={floorFilter} onChange={e => setFloorFilter(e.target.value)} aria-label="Filter by floor">
              <option value="all">All floors</option>
              {floors.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="tenant-toolbar-right">
          <div className="tenant-view-toggle" role="group" aria-label="Unit view">
            <button type="button" className={viewMode==='grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
              <LayoutGrid size={14} /> Grid View
            </button>
            <button type="button" className={viewMode==='map' ? 'active' : ''} onClick={() => setViewMode('map')}>
              <MapIcon size={14} /> Floor Plan
            </button>
          </div>
          <span className="tenant-hint" style={{ borderRadius: 999, padding: '6px 10px', background: '#ffffff', border: '1px solid var(--border-color)' }}><Clock size={12} /> {viewMode==='map' ? 'Click a map marker to apply' : 'Select a unit to start a lease request'}</span>
        </div>
      </div>

      {viewMode === 'map' && (
        <section className="tenant-map-section">
          <div className="tenant-map-grid">
            <div className="tenant-map-list">
              <h3 style={{ margin:'0 0 8px', fontSize:13, fontWeight:800 }}>Vacant Units ({filtered.length})</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:'56vh', overflow:'auto', paddingRight:4 }}>
                {filtered.map(u => (
                  <button key={u.id} type="button" onClick={() => { setSelectedMapId(u.id); focusUnit(u.id); }} style={{ textAlign:'left', padding:10, borderRadius:10, border: selectedMapId===u.id ? '2px solid var(--accent-color)' : '1px solid #e0f2fe', background: selectedMapId===u.id ? '#f0f9ff' : '#fff', cursor:'pointer' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:12, background: selectedMapId===u.id ? 'var(--accent-color)' : '#0c4a6e', color:'#fff', padding:'2px 6px', borderRadius:6 }}>{unitCode(u)}</span><span style={{ fontSize:11, color:'var(--text-secondary)' }}>{u.floor?.floorname}</span></div>
                    <div style={{ fontSize:13, fontWeight:700, marginTop:4 }}>{u.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{u.minLeaseYears} yr min · {u.monthlyFee ? formatRupiah(u.monthlyFee)+'/bln' : '-'}</div>
                    {selectedMapId===u.id && <div style={{ marginTop:6 }}><span onClick={(e)=>{e.stopPropagation(); openRequest(u);}} className="btn-secondary" style={{ display:'inline-flex', padding:'6px 10px', fontSize:11, borderRadius:999 }}><FileText size={11} /> Apply</span></div>}
                  </button>
                ))}
                {filtered.length===0 && <div style={{ fontSize:12, opacity:0.6, padding:12, border:'1px dashed #bae6fd', borderRadius:8, textAlign:'center' }}>No units</div>}
              </div>
            </div>
            <div className="tenant-map-canvas" onPointerDown={handlePanDown} onPointerMove={handlePanMove} onPointerUp={handlePanUp} onPointerLeave={handlePanUp}>
              <div style={{ position:'absolute', top:10, left:10, zIndex:5, display:'flex', gap:6, alignItems:'center', background:'rgba(255,255,255,0.92)', border:'1px solid #e0f2fe', borderRadius:999, padding:'6px 10px', fontSize:11, fontWeight:700, backdropFilter:'blur(8px)' }}><Crosshair size={12} /> Ground Floor Plan <span style={{ opacity:0.6 }}>| drag to pan · scroll to zoom</span>
                <span style={{ display:'inline-flex', gap:4, marginLeft:8 }}>
                  <button type="button" className="btn-icon-action" onClick={()=>setScale(s=>Math.min(4,s*1.2))} style={{ width:26, height:26 }}><ZoomIn size={12} /></button>
                  <button type="button" className="btn-icon-action" onClick={()=>setScale(s=>Math.max(0.6,s*0.85))} style={{ width:26, height:26 }}><ZoomOut size={12} /></button>
                  <button type="button" className="btn-icon-action" onClick={()=>{setScale(1);setTx(0);setTy(0);}} style={{ width:26, height:26 }}><RotateCcw size={12} /></button>
                </span>
              </div>
              <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet" style={{ width:'100%', height:'100%', display:'block', transform:`translate(${tx}px,${ty}px) scale(${scale})`, transformOrigin:'0 0' }}>
                <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#f8fafc" />
                <image href="/ground-floor.svg" x={0} y={0} width={SVG_W} height={SVG_H} preserveAspectRatio="xMidYMid meet" />
                {filtered.map(u=>{
                  const isSel = selectedMapId===u.id;
                  return (
                    <g key={u.id} className="tenant-map-marker" transform={`translate(${u.x} ${u.y})`} onClick={()=>{setSelectedMapId(u.id); openRequest(u);}} style={{ cursor:'pointer' }}>
                      {isSel && <circle r={22} fill="#0284c7" opacity={0.14} />}
                      <rect x={-28} y={-16} width={56} height={32} rx={8} fill={isSel ? '#0c4a6e' : '#0284c7'} stroke="#fff" strokeWidth={2} />
                      <text y={-2} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="#fff">{unitCode(u)}</text>
                      <text y={8} textAnchor="middle" fontSize={5.5} fontWeight={600} fill="#fff">{unitSub(u).slice(0,10)}</text>
                    </g>
                  );
                })}
                {filtered.length===0 && <text x={SVG_W/2} y={SVG_H/2} textAnchor="middle" fontSize={14} fill="#94a3b8" fontWeight={700}>No vacant units on the plan</text>}
              </svg>
              <div style={{ position:'absolute', bottom:10, left:10, background:'rgba(12,74,110,0.92)', color:'#fff', fontSize:11, padding:'6px 10px', borderRadius:8 }}>Click a marker to apply · {filtered.length} units mapped</div>
            </div>
          </div>
        </section>
      )}

      {viewMode === 'grid' && (
        loading ? <p className="welcome-text">Loading vacant units...</p> : filtered.length === 0 ? (
          <div className="landing-empty">No vacant units match your search. Try adjusting your search.</div>
        ) : (
          <div className="tenant-grid">
            {filtered.map((u) => (
              <article key={u.id} className="tenant-request-card">
                <div className="tenant-req-head">
                  <span className="tenant-unit-badge">{unitCode(u)}</span>
                  <span className={`status-badge ${u.monthlyFee ? 'solid' : 'outline'}`} style={u.monthlyFee ? { background:'var(--accent-color)' } : undefined}>{u.minLeaseYears} yr min</span>
                </div>
                <h3 className="tenant-req-name">{u.name}</h3>
                <div className="tenant-req-meta">
                  <span><MapPin size={12} /> {u.floor?.floorname ?? '-'} {u.floor?.floorcode ? `(${u.floor.floorcode})` : ''}</span>
                  <span onClick={()=>{setViewMode('map'); setSelectedMapId(u.id); setTimeout(()=>focusUnit(u.id),100);}} style={{ cursor:'pointer', color:'var(--accent-color)', fontWeight:700 }}>· View on Map →</span>
                </div>
                <div className="tenant-cost-box">
                  <div className="tenant-cost-row">
                    <span><Wallet size={12} /> Monthly fee</span>
                    <b>{u.monthlyFee ? formatRupiah(u.monthlyFee) : '— Contact admin'}</b>
                  </div>
                  <div className="tenant-cost-examples">
                    <span>3 mo: {u.monthlyFee ? formatRupiah(Math.round(u.monthlyFee*3*0.98)) : '-'}</span>
                    <span>6 mo: {u.monthlyFee ? formatRupiah(Math.round(u.monthlyFee*6*0.95)) : '-'}</span>
                    <span>12 mo: {u.monthlyFee ? formatRupiah(Math.round(u.monthlyFee*12*0.9)) : '-'}</span>
                  </div>
                </div>
                <button type="button" className="btn-secondary tenant-req-btn" onClick={() => openRequest(u)}>
                  <FileText size={14} /> Apply for Lease
                </button>
              </article>
            ))}
          </div>
        )
      )}

      {formOpen && selected && (
        <Modal title={`Apply for Lease ${unitCode(selected)}`} onClose={() => setFormOpen(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="two-col-grid" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 12 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Unit</div><b style={{ fontSize: 13 }}>{unitCode(selected)} · {selected.floor?.floorname}</b></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Monthly fee</div><b style={{ fontSize: 13 }}>{formatRupiah(selected.monthlyFee ?? 0)}</b></div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label"><Calendar size={12} /> Contract Duration (months)</label>
              <input className="form-input" type="number" min={MIN_DURATION} max={MAX_DURATION} step={1}
                value={duration}
                onChange={e => setDuration(Math.floor(Number(e.target.value)))}
                onBlur={() => setDuration(d => Math.min(MAX_DURATION, Math.max(MIN_DURATION, d || MIN_DURATION)))}
                style={{ paddingLeft: 12, fontFamily: 'var(--mono)' }} />
              <div style={{ fontSize: 11, color: durationInvalid ? '#dc2626' : 'var(--text-secondary)', marginTop: 4 }}>
                {durationInvalid
                  ? `Minimum ${MIN_DURATION} months (1 year) — maximum ${MAX_DURATION}.`
                  : `Selected ${duration} months`}
              </div>
              <div style={{ marginTop: 8, padding: 10, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>Subtotal ({duration} × {formatRupiah(selectedFee)})</span><span>{formatRupiah(selectedFee * duration)}</span></div>
                <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', justifyContent: 'space-between', marginTop: 6, borderTop: '1px dashed #bae6fd', paddingTop: 6 }}><span>Total</span><span>{formatRupiah(total)}</span></div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Contract start: <input type="date" value={contractStart} onChange={e => setContractStart(e.target.value)} style={{ fontSize: 11, padding: '4px 6px', border: '1px solid #bae6fd', borderRadius: 6 }} /></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10, background: '#f8fafc', border: '1px dashed var(--border-color)', borderRadius: 10 }}>
              <CreditCard size={14} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-color)' }} />
              <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                No payment is needed now — this request goes for review. Once it is <b>approved</b>, your first invoice appears in <b>Costs &amp; Contract</b> and is paid securely through <b>Midtrans</b>. We&apos;ll email you when it&apos;s approved.
              </div>
            </div>

            <div className="two-col-grid gap-10">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label"><Store size={12} /> Business Name *</label>
                <input className="form-input" style={{ paddingLeft: 12 }} placeholder="e.g. Kopi Kenangan" value={businessName} onChange={e => setBusinessName(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label"><Phone size={12} /> Phone / WhatsApp *</label>
                <input className="form-input" style={{ paddingLeft: 12 }} placeholder="08xx" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="two-col-grid gap-10">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Business Category</label>
                <select className="form-input" style={{ paddingLeft: 12 }} value={businessCategory} onChange={e => setBusinessCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {businessCategory === 'Other' && (
                  <input className="form-input" style={{ paddingLeft: 12, marginTop: 6 }} value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Type your category" />
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label"><User size={12} /> Person in Charge</label>
                <input className="form-input" style={{ paddingLeft: 12 }} placeholder="Full name of person in charge" value={personInCharge} onChange={e => setPersonInCharge(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Business Notes / Description</label>
              <textarea className="form-input" style={{ paddingLeft: 12, minHeight: 70 }} placeholder="Describe your business concept, electrical needs, etc." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="button" className="btn-secondary" onClick={handleSubmit}>Submit Request — {formatRupiah(total)}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
