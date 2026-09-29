import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Pencil, Plus, Trash2, X, Image as ImageIcon } from 'lucide-react';
import Modal from '../../../components/Modal';
import SearchBar from '../../../components/SearchBar';
import Pagination from '../../../components/Pagination';
import ImageCropModal from '../../../components/ImageCropModal';
import { useConfirm } from '../../../components/ConfirmDialog';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';
import { buildMeta } from '../../../utils/meta';

interface EventRow {
  eventid: number;
  name: string;
  description: string | null;
  floorid: number | null;
  floor?: { floorid: number; floorname: string; floorcode?: string | null } | null;
  location: string;
  startDate: string;
  endDate: string;
  posters: string[];
}

interface EventForm {
  name: string;
  description: string;
  floorid: number | null;
  location: string;
  startDate: string;
  endDate: string;
  posters: string[];
}

interface FloorOption {
  floorid: number;
  floorname: string;
  floorcode: string | null;
}

const FALLBACK_FLOORS = ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3'];

const emptyForm: EventForm = {
  name: '',
  description: '',
  floorid: null,
  location: '',
  startDate: '',
  endDate: '',
  posters: [],
};

const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : '');

const PAGE_SIZE = 20;

type EventStatus = 'current' | 'upcoming' | 'past' | 'all';

const STATUS_LABELS: Record<EventStatus, string> = {
  all: 'All',
  current: 'Current',
  upcoming: 'Upcoming',
  past: 'Past',
};

const STATUS_ORDER: EventStatus[] = ['all', 'current', 'upcoming', 'past'];

/** Tanggal lokal midnight — DB menyimpan tanggal polos, jadi jangan konversi timezone. */
const toLocalDay = (iso: string) => {
  const [y, m, d] = toDateInput(iso).split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const todayStart = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
};

/** `endDate` diperlakukan inklusif sampai akhir harinya. */
function statusOf(ev: EventRow, today: number): Exclude<EventStatus, 'all'> {
  const start = toLocalDay(ev.startDate);
  const end = toLocalDay(ev.endDate);
  if (end < today) return 'past';
  if (start > today) return 'upcoming';
  return 'current';
}

const formatDate = (iso: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function EventDataView() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [posterFiles, setPosterFiles] = useState<File[]>([]);
  const [cropQueue, setCropQueue] = useState<{ url: string; fileName: string }[]>([]);
  const [search, setSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus>('current');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dbFloors, setDbFloors] = useState<FloorOption[]>([]);
  const { askConfirm, confirmDialog } = useConfirm();

  useEffect(() => {
    axios
      .get<FloorOption[]>(`${BACKEND_URL}/floors`)
      .then((r) => setDbFloors(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    axios
      .get<EventRow[]>(`${BACKEND_URL}/events`)
      .then((res) => {
        if (!ignore) {
          setEvents(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast('Failed to load event data from server.');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const floorOptions: FloorOption[] = dbFloors.length
    ? dbFloors
    : FALLBACK_FLOORS.map((floorname, i) => ({ floorid: i + 1, floorname, floorcode: null }));

  const today = todayStart();

  const counts = useMemo(() => {
    const acc: Record<EventStatus, number> = { all: events.length, current: 0, upcoming: 0, past: 0 };
    for (const ev of events) acc[statusOf(ev, today)]++;
    return acc;
  }, [events, today]);

  const filtered = events.filter((ev) => {
    if (statusFilter !== 'all' && statusOf(ev, today) !== statusFilter) return false;
    if (filterDateFrom && toDateInput(ev.startDate) < filterDateFrom) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(ev).some((v) => String(v).toLowerCase().includes(q));
  });
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleDateFromChange = (v: string) => { setFilterDateFrom(v); setPage(1); };
  const handleStatusChange = (v: EventStatus) => { setStatusFilter(v); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  const openAdd = () => {
    setForm(emptyForm);
    setPosterFiles([]);
    setCropQueue([]);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (event: EventRow) => {
    setForm({
      name: event.name,
      description: event.description || '',
      floorid: event.floorid ?? null,
      location: event.location,
      startDate: toDateInput(event.startDate),
      endDate: toDateInput(event.endDate),
      posters: Array.isArray(event.posters) ? [...event.posters] : [],
    });
    setPosterFiles([]);
    setCropQueue([]);
    setEditId(event.eventid);
    setModalOpen(true);
  };

  const handleDelete = async (event: EventRow) => {
    try {
      await axios.delete(`${BACKEND_URL}/events/${event.eventid}`, {
        data: { meta: await buildMeta() },
      });
      toast('Event deleted');
      refresh();
    } catch {
      toast('Failed to delete event');
    }
  };

  const askDelete = (event: EventRow) => {
    askConfirm({
      title: 'Delete Event',
      message: (
        <>
          Delete event <strong>{event.name}</strong>? All of its promo posters and details will be
          removed.
        </>
      ),
      confirmLabel: 'Delete',
      onConfirm: () => handleDelete(event),
    });
  };

  const handlePosterFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setCropQueue((prev) => [
      ...prev,
      ...files.map((f) => ({ url: URL.createObjectURL(f), fileName: f.name })),
    ]);
    e.target.value = '';
  };

  const handleCropApply = (file: File) => {
    setPosterFiles((prev) => [...prev, file]);
    setCropQueue((prev) => prev.slice(1));
  };

  const handleCropCancel = () => setCropQueue((prev) => prev.slice(1));

  const pendingCrop = cropQueue[0] || null;

  const removePosterFile = (i: number) => setPosterFiles((prev) => prev.filter((_, idx) => idx !== i));

  const removeExistingPoster = (i: number) =>
    setForm((f) => ({ ...f, posters: f.posters.filter((_, idx) => idx !== i) }));

  const uploadPosters = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const f of files) {
      const fd = new FormData();
      fd.append('image', f);
      const res = await axios.post<{ url: string }>(`${BACKEND_URL}/uploads/image`, fd);
      urls.push(res.data.url);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.startDate || !form.endDate) return;
    try {
      let posters = form.posters;
      if (posterFiles.length) {
        const urls = await uploadPosters(posterFiles);
        posters = [...posters, ...urls];
      }
      const payload = {
        ...form,
        description: form.description.trim(),
        posters,
        floorid: form.floorid || null,
      };
      if (editId !== null) {
        await axios.patch(`${BACKEND_URL}/events/${editId}`, payload);
      } else {
        await axios.post(`${BACKEND_URL}/events`, payload);
      }
      setModalOpen(false);
      toast('Event saved successfully');
      refresh();
    } catch {
      toast('Failed to save event.');
    }
  };

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header event-data-header data-actions-stack">
        <div>
          <h2 className="welcome-title"><Calendar size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Event Data</h2>
          <p className="welcome-text">Schedule of promotions, exhibitions, and entertainment in the main atrium.</p>
        </div>
        <div className="data-page-actions">
          <SearchBar value={search} onChange={handleSearchChange} placeholder="Search events..." />
          <input
            type="date"
            className="filter-select"
            value={filterDateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            title="Filter — events starting from this date"
            aria-label="Filter from date"
          />
          <button className="btn-add" onClick={openAdd}>
            <Plus size={15} /> Add Event
          </button>
        </div>
      </div>

      <div className="event-status-bar">
        <div className="seg-control seg-tabs" role="tablist" aria-label="Filter events by schedule status">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={statusFilter === s}
              className={`seg-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => handleStatusChange(s)}
            >
              {STATUS_LABELS[s]}
              <span className="seg-btn-count">{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="data-scroll">
        {loading ? (
          <p className="welcome-text">Loading data from database...</p>
        ) : filtered.length === 0 ? (
          <p className="welcome-text">
            {search || filterDateFrom
              ? 'No events match your search.'
              : statusFilter === 'current'
                ? 'No events are running right now.'
                : statusFilter === 'upcoming'
                  ? 'No upcoming events scheduled.'
                  : 'No past events recorded.'}
          </p>
        ) : (
          <div className="data-grid">
            {paged.map((ev) => {
              const posters = Array.isArray(ev.posters) ? ev.posters : [];
              const cover = posters[0] || null;
              return (
                <article key={ev.eventid} className="data-card event-data-card">
                  <Link
                    to={`/dashboard/event-data/${ev.eventid}`}
                    className="event-card-link"
                    aria-label={`View details for ${ev.name}`}
                  />

                  <div className="event-card-cover">
                    {cover ? (
                      <img className="event-card-cover-img" src={cover} alt={`${ev.name} cover`} />
                    ) : (
                      <span className="event-card-cover-empty">
                        <Calendar size={20} />
                        No poster
                      </span>
                    )}

                    <div className="data-card-actions event-card-cover-actions">
                      <button className="btn-icon-action edit" onClick={() => openEdit(ev)} title="Edit" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn-icon-action delete" onClick={() => askDelete(ev)} title="Delete" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="data-card-head">
                    <div>
                      <h3 className="data-card-name">{ev.name}</h3>
                      <span className="data-card-unit">{ev.floor?.floorname ? `${ev.floor.floorname} — ${ev.location}` : ev.location}</span>
                    </div>
                  </div>

                  <p className="event-card-dates">
                    {formatDate(ev.startDate)} &ndash; {formatDate(ev.endDate)}
                    <span className={`event-status-chip ${statusOf(ev, today)}`}>
                      {STATUS_LABELS[statusOf(ev, today)]}
                    </span>
                  </p>

                  {ev.floor?.floorname && ev.floor.floorname !== 'Lower Ground' && (
                    <div className="data-card-badges">
                      <span className="status-badge outline">{ev.floor.floorname}</span>
                    </div>
                  )}

                  {ev.description && (
                    <p className="event-card-description">{ev.description}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="table-footer">
        <span className="table-footer-info">
          Showing {filtered.length === 0 ? 0 : startIdx + 1}&ndash;{startIdx + paged.length} of {filtered.length} events
        </span>
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {modalOpen && (
        <Modal
          title={editId !== null ? 'Edit Event' : 'Add Event'}
          onClose={() => {
            setCropQueue([]);
            setModalOpen(false);
          }}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Event Name</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Midnight Sale"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input event-description-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the event, promotion, or visitor experience..."
                rows={4}
              />
            </div>
            <div className="two-col-grid">
              <div className="form-group">
                <label className="form-label">Floor</label>
                <select
                  className="form-input"
                  value={form.floorid ?? ''}
                  onChange={(e) => setForm({ ...form, floorid: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">All Floors / Atrium</option>
                  {floorOptions.map((fl) => (
                    <option key={fl.floorid} value={fl.floorid}>
                      {fl.floorname}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location Detail</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Main Atrium, near the fountain"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label"><ImageIcon size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Promo Posters (multiple)</label>
              <div className="settings-upload-box">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  {posterFiles.length === 0 && form.posters.length === 0 && (
                    <span className="tenant-logo-preview placeholder"><ImageIcon size={20} /></span>
                  )}
                  {form.posters.map((p, i) => (
                    <div key={`exist-${i}`} style={{ position: 'relative' }}>
                      <img
                        src={p}
                        alt="poster"
                        title="Saved poster"
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingPoster(i)}
                        title="Remove poster"
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: 'none',
                          background: '#dc2626',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {posterFiles.map((f, i) => (
                    <div key={`new-${i}`} style={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        title={f.name}
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }}
                      />
                      <button
                        type="button"
                        onClick={() => removePosterFile(i)}
                        title="Remove file"
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: 'none',
                          background: '#dc2626',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                    onChange={handlePosterFiles}
                    className="file-input"
                  />
                </div>
                <small className="form-hint">PNG/JPG/SVG/WEBP, max 2&nbsp;MB each. Each photo opens the crop screen before being added.</small>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-secondary">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendingCrop && (
        <ImageCropModal
          imageUrl={pendingCrop.url}
          fileName={pendingCrop.fileName}
          onCancel={handleCropCancel}
          onApply={handleCropApply}
        />
      )}

      {confirmDialog}
    </div>
  );
}

export default EventDataView;
