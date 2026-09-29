import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import Modal from '../../../components/Modal';
import SearchBar from '../../../components/SearchBar';
import Pagination from '../../../components/Pagination';
import { useConfirm } from '../../../components/ConfirmDialog';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';
import { buildMeta } from '../../../utils/meta';

interface FloorRow {
  floorid: number;
  floorname: string;
  floorcode: string | null;
  // Aggregated server-side through floor -> locations -> tenants.
  tenantCount?: number;
  _count?: { locations?: number };
}

const locationCount = (f: FloorRow) => f._count?.locations ?? 0;

const emptyForm = { floorname: '', floorcode: '' };
const PAGE_SIZE = 20;

function FloorDataView() {
  const [floors, setFloors] = useState<FloorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const { askConfirm, confirmDialog } = useConfirm();

  // drag-reorder table rows (long-press to lift, then drag up/down)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLifted = useRef(false);

  const startLift = (idx: number) => {
    isLifted.current = true;
    setDragIndex(idx);
    // prevent text selection while lifting
    window.getSelection()?.removeAllRanges();
    document.body.classList.add('no-select');
    document.documentElement.classList.add('no-select');
  };
  const handleRowPointerDown = (e: React.PointerEvent, idx: number) => {
    // prevent the browser from starting a text selection on press
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => startLift(idx), 350);
  };
  const handleRowPointerUp = async () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    const wasLifted = isLifted.current;
    isLifted.current = false;
    // always clear no-select, even if the row was not actually reordered
    document.body.classList.remove('no-select');
    document.documentElement.classList.remove('no-select');
    window.getSelection()?.removeAllRanges();
    if (!wasLifted) return;
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      // dragIndex/dragOverIndex are indices inside the *paged* view, not the global `floors` array.
      // Map them to global indices via floorid so paginated/filtered views reorder correctly.
      const dragged = paged[dragIndex];
      const over = paged[dragOverIndex];
      if (!dragged || !over) { setDragIndex(null); setDragOverIndex(null); return; }
      const globalDragIdx = floors.findIndex((f) => f.floorid === dragged.floorid);
      const globalOverIdx = floors.findIndex((f) => f.floorid === over.floorid);
      if (globalDragIdx === -1 || globalOverIdx === -1) { setDragIndex(null); setDragOverIndex(null); return; }
      const next = [...floors];
      const [moved] = next.splice(globalDragIdx, 1);
      // When dragging downwards, the target index shifts left after removal
      const insertIdx = globalDragIdx < globalOverIdx ? globalOverIdx : globalOverIdx;
      next.splice(insertIdx, 0, moved);
      const orderedIds = next.map((f) => f.floorid);
      setFloors(next);
      // Save to database & notify (localStorage kept as a fast local cache)
      localStorage.setItem('sim_mall_floor_order', JSON.stringify(orderedIds));
      window.dispatchEvent(new Event('floorOrderChanged'));
      try {
        await axios.post(`${BACKEND_URL}/floors/reorder`, { orderedIds, meta: await buildMeta() });
        toast('Floor order saved to database & synced to the mall lift & indoor map');
      } catch (e) {
        const msg = axios.isAxiosError(e) ? e.response?.data?.message || e.message : 'failed to save to database';
        toast(`Floor order kept locally — ${msg}`);
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleRowPointerMove = (e: React.PointerEvent, idx: number) => {
    if (isLifted.current) {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      setDragOverIndex(idx);
    }
  };

  useEffect(() => {
    const onUp = () => handleRowPointerUp();
    if (isLifted.current) {
      window.addEventListener('pointerup', onUp);
      return () => window.removeEventListener('pointerup', onUp);
    }
  });

  // safety: if the drag is cancelled / component unmounts, make sure selection is cleared
  useEffect(() => {
    if (dragIndex !== null) {
      document.body.classList.add('no-select');
      document.documentElement.classList.add('no-select');
    } else {
      document.body.classList.remove('no-select');
      document.documentElement.classList.remove('no-select');
    }
    return () => {
      document.body.classList.remove('no-select');
      document.documentElement.classList.remove('no-select');
      window.getSelection()?.removeAllRanges();
    };
  }, [dragIndex]);

  useEffect(() => {
    let ignore = false;
    axios.get<FloorRow[]>(`${BACKEND_URL}/floors`)
      .then((f) => { if (!ignore) { setFloors(f.data); setLoading(false); } })
      .catch(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => setRefreshKey(k => k + 1);
  const filtered = floors.filter(f => [f.floorname, f.floorcode].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const openAdd = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (floor: FloorRow) => { setForm({ floorname: floor.floorname, floorcode: floor.floorcode || '' }); setEditId(floor.floorid); setModalOpen(true); };
  const handleDelete = async (floor: FloorRow) => {
    try { await axios.delete(`${BACKEND_URL}/floors/${floor.floorid}`, { data: { meta: await buildMeta() } }); refresh(); toast('Floor deleted'); } catch (err) { const m = axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to delete floor'; toast(m); }
  };
  const askDelete = (floor: FloorRow) => {
    const locs = locationCount(floor);
    askConfirm({
      title: 'Delete Floor',
      message: (
        <>
          Delete floor <strong>{floor.floorname}</strong>?
          {locs > 0 ? (
            <>
              {' '}
              <strong>{locs}</strong> location{locs > 1 ? 's are' : ' is'} still assigned to this floor, so deletion
              will be rejected — move {locs > 1 ? 'them' : 'it'} first.
            </>
          ) : (
            ' It has no locations, so nothing else is affected.'
          )}
        </>
      ),
      confirmLabel: 'Delete',
      onConfirm: () => handleDelete(floor),
    });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.floorname) return;
    try { if (editId !== null) await axios.patch(`${BACKEND_URL}/floors/${editId}`, form); else await axios.post(`${BACKEND_URL}/floors`, form); setModalOpen(false); toast('Floor saved'); refresh(); } catch (err) { const m = axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to save floor'; toast(m); }
  };

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header data-actions-stack">
        <div>
          <h2 className="welcome-title"><Layers size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Floor Data</h2>
          <p className="welcome-text">Floor structure — tenant counts follow the floor &rarr; location &rarr; tenant link. Long-press a row to drag and reorder floors (saved to the database &amp; synced to the mall lift + indoor map).</p>
        </div>
        <div className="data-page-actions">
          <SearchBar value={search} onChange={handleSearchChange} placeholder="Search floors..." />
          <button className="btn-add" onClick={openAdd}><Plus size={15} /> Add Floor</button>
        </div>
      </div>

      <div className="data-scroll">
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Floor Name</th><th>Code</th><th>Tenant Count</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr className="empty-row"><td colSpan={4}>Loading...</td></tr> : paged.length === 0 ? <tr className="empty-row"><td colSpan={4}>No floors</td></tr> : paged.map((f, i) => (
              <tr
                key={f.floorid}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className={`${isLifted.current && dragIndex === i ? 'floor-row dragging' : ''} ${isLifted.current && dragOverIndex === i && dragIndex !== i ? 'floor-row drag-over' : ''}`}
                onPointerDown={(e) => handleRowPointerDown(e, i)}
                onPointerMove={(e) => handleRowPointerMove(e, i)}
                onPointerUp={handleRowPointerUp}
                onPointerLeave={() => { if (!isLifted.current && longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                style={{ cursor: isLifted.current ? 'grabbing' : 'grab', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
              >
                <td style={{ fontWeight: 600 }}>{f.floorname}</td>
                <td><span className="status-badge outline">{f.floorcode || '-'}</span></td>
                <td>{f.tenantCount ?? 0} tenants</td>
                <td><div className="row-actions"><button className="btn-icon-action edit" onClick={() => openEdit(f)}><Pencil size={14} /></button><button className="btn-icon-action delete" onClick={() => askDelete(f)}><Trash2 size={14} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      <div className="table-footer"><span className="table-footer-info">Showing {filtered.length === 0 ? 0 : startIdx + 1}–{startIdx + paged.length} of {filtered.length}</span><Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} /></div>

      {modalOpen && (
        <Modal title={editId !== null ? `Edit Floor #${editId}` : 'Add Floor'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Floor Name</label><input type="text" className="form-input" value={form.floorname} onChange={e => setForm({ ...form, floorname: e.target.value })} placeholder="e.g. Floor 1" /></div>
            <div className="form-group"><label className="form-label">Floor Code</label><input type="text" className="form-input" value={form.floorcode} onChange={e => setForm({ ...form, floorcode: e.target.value })} placeholder="e.g. F1" /></div>
            <div className="modal-actions"><button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn-secondary">Save</button></div>
          </form>
        </Modal>
      )}

      {confirmDialog}
    </div>
  );
}
export default FloorDataView;
