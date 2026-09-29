import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Car, CircleParking, Clock, MousePointerClick, Search, Tag } from 'lucide-react';
import Modal from '../../../components/Modal';
import Select from '../../../components/Select';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';
import type { UserInfo } from '../../../types';

type VehicleType = 'Roda 4' | 'Roda 2';
type TabKey = 'masuk' | 'keluar';

interface ParkirEntry {
  id: number;
  plate: string;
  type: VehicleType;
  entryAt: Date;
  entryBy?: number | null;
}

interface HistoryItem {
  id: number;
  plate: string;
  type: VehicleType;
  entryAt?: Date;
  exitAt: Date;
  fee: number;
  entryBy?: number | null;
  exitBy?: number | null;
}

interface ParkirResponse {
  active: Array<{ ticketid: number; plate: string; type: string; entryAt: string; exitAt: string | null; fee: number | null; entryBy?: number | null; exitBy?: number | null }>;
  history: Array<{ ticketid: number; plate: string; type: string; entryAt: string; exitAt: string | null; fee: number | null; entryBy?: number | null; exitBy?: number | null }>;
  stats: { activeCount: number; revenue: number };
}

const FREE_MINUTES = 15;
const PAGE_SIZE = 20;

const TYPE_LABELS: Record<VehicleType, string> = {
  'Roda 4': '4 Wheels',
  'Roda 2': '2 Wheels',
};

const calcFee = (entryAt: Date, exitAt: Date, type: VehicleType) => {
  const minutes = Math.max(0, Math.floor((exitAt.getTime() - entryAt.getTime()) / 60000));
  if (minutes <= FREE_MINUTES) return { minutes, fee: 0 };
  const hours = Math.ceil(minutes / 60);
  const base = type === 'Roda 4' ? 5000 : 3000;
  return { minutes, fee: base + Math.max(0, hours - 2) * 2000 };
};

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('en-US')}`;

const formatStopwatch = (entryAt: Date, now: Date) => {
  const totalSec = Math.max(0, Math.floor((now.getTime() - entryAt.getTime()) / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}.${m}.${s}`;
};

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function ParkirView({ showOperator = false }: { showOperator?: boolean }) {
  const operator = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') ?? 'null') as UserInfo | null;
    } catch {
      return null;
    }
  })();
  const operatorId = operator?.userid;
  const canShowOperator =
    showOperator && ['admin', 'superadmin'].includes((operator?.level ?? '').toLowerCase());

  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<TabKey>('masuk');
  const [entries, setEntries] = useState<ParkirEntry[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState('');
  const [type, setType] = useState<VehicleType>('Roda 4');
  const [exitVehicle, setExitVehicle] = useState<ParkirEntry | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Semua' | VehicleType>('Semua');
  const [durationFilter, setDurationFilter] = useState<'all' | 'lt1h' | 'h1to3' | 'gt3h'>('all');
  const [exitPage, setExitPage] = useState(1);
  const [tariffOpen, setTariffOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    axios
      .get<ParkirResponse>(`${BACKEND_URL}/parkir`)
      .then((res) => {
        if (!ignore) {
          setEntries(
            res.data.active.map((t) => ({
              id: t.ticketid,
              plate: t.plate,
              type: t.type === 'Roda 2' ? 'Roda 2' : 'Roda 4',
              entryAt: new Date(t.entryAt),
              entryBy: t.entryBy ?? null,
            }))
          );
          setHistory(
            res.data.history.map((t) => ({
              id: t.ticketid,
              plate: t.plate,
              type: t.type === 'Roda 2' ? 'Roda 2' : 'Roda 4',
              entryAt: new Date(t.entryAt),
              exitAt: new Date(t.exitAt as string),
              fee: t.fee ?? 0,
              entryBy: t.entryBy ?? null,
              exitBy: t.exitBy ?? null,
            }))
          );
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast('Failed to load parking data from server.');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = plate.trim().toUpperCase();
    if (!clean) {
      toast('License plate number is required.');
      return;
    }
    try {
      await axios.post(`${BACKEND_URL}/parkir/entry`, { plate: clean, type, userId: operatorId });
      setPlate('');
      toast('Vehicle entry recorded');
      refresh();
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to record vehicle entry.';
      toast(message);
    }
  };

  const selectExit = (entry: ParkirEntry) => {
    const { fee } = calcFee(entry.entryAt, now, entry.type);
    setExitVehicle(entry);
    setPayAmount(String(fee));
  };

  const confirmExit = async (e: FormEvent) => {
    e.preventDefault();
    if (!exitVehicle) return;
    const amount = Number(payAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast('Invalid amount.');
      return;
    }
    const { fee } = calcFee(exitVehicle.entryAt, now, exitVehicle.type);
    if (amount < fee) {
      toast('Amount paid is less than the fee due.');
      return;
    }
    try {
      await axios.post(`${BACKEND_URL}/parkir/${exitVehicle.id}/exit`, { fee, userId: operatorId });
      setExitVehicle(null);
      setPayAmount('');
      toast('Exit payment recorded');
      refresh();
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to process vehicle exit.';
      toast(message);
    }
  };

  const sortedEntries = [...entries].sort((a, b) => b.entryAt.getTime() - a.entryAt.getTime());
  const recentThree = sortedEntries.slice(0, 3);

  const filteredExit = sortedEntries.filter((en) => {
    const matchSearch =
      en.plate.toLowerCase().includes(search.toLowerCase()) ||
      en.type.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'Semua' || en.type === typeFilter;
    const hoursParked = (now.getTime() - en.entryAt.getTime()) / 3600000;
    const matchDuration =
      durationFilter === 'all' ||
      (durationFilter === 'lt1h' && hoursParked < 1) ||
      (durationFilter === 'h1to3' && hoursParked >= 1 && hoursParked <= 3) ||
      (durationFilter === 'gt3h' && hoursParked > 3);
    return matchSearch && matchType && matchDuration;
  });

  const exitTotalPages = Math.max(1, Math.ceil(filteredExit.length / PAGE_SIZE));
  const exitCurrentPage = Math.min(exitPage, exitTotalPages);
  const pagedExit = filteredExit.slice((exitCurrentPage - 1) * PAGE_SIZE, exitCurrentPage * PAGE_SIZE);
  const exitStartIdx = (exitCurrentPage - 1) * PAGE_SIZE;

  const handleExitSearch = (v: string) => {
    setSearch(v);
    setExitPage(1);
  };
  const handleExitTypeFilter = (v: 'Semua' | VehicleType) => {
    setTypeFilter(v);
    setExitPage(1);
  };
  const handleExitDurationFilter = (v: typeof durationFilter) => {
    setDurationFilter(v);
    setExitPage(1);
  };

  const revenue = history.reduce((sum, h) => sum + h.fee, 0);

  const exitFee = exitVehicle ? calcFee(exitVehicle.entryAt, now, exitVehicle.type).fee : 0;
  const paidAmount = Number(payAmount);
  const exitChange = exitVehicle && paidAmount >= exitFee ? paidAmount - exitFee : 0;

  return (
    <div className="simulator-panel parkir-view" style={{ marginTop: 0 }}>
      <div className="parkir-topbar">
        <h2 className="welcome-title"><Car size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Parking Management</h2>
        <div className="parkir-topbar-right">
          <div className="parkir-clock" aria-label="Realtime clock">
            <Clock size={15} />
            <div className="parkir-clock-text">
              <span className="parkir-clock-time">{formatTime(now)}</span>
              <span className="parkir-clock-date">{formatDate(now)}</span>
            </div>
          </div>
          <div className="mini-stats mini-stats-inline">
            <div className="mini-stat">
              <span className="mini-stat-val">{loading ? '...' : entries.length}</span>
              <span className="mini-stat-lbl">Active</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-val">{loading ? '...' : formatRupiah(revenue)}</span>
              <span className="mini-stat-lbl">Revenue</span>
            </div>
          </div>
        </div>
      </div>

      <div className="seg-control seg-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'masuk'}
          className={`seg-btn ${tab === 'masuk' ? 'active' : ''}`}
          onClick={() => setTab('masuk')}
        >
          Vehicle Entry
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'keluar'}
          className={`seg-btn ${tab === 'keluar' ? 'active' : ''}`}
          onClick={() => setTab('keluar')}
        >
          Vehicle Exit
        </button>
      </div>

      {tab === 'masuk' && (
        <div className="parkir-split">
          <div className="parkir-split-left">
            <div className="section-header-row">
              <h3 className="parkir-section-title"><CircleParking size={16} /> 3 Latest Vehicles</h3>
              <span className="current-time">{formatDate(now)} &mdash; {formatTime(now)}</span>
            </div>
            <div className="table-container" style={{ marginTop: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Plate Number</th>
                    <th>Type</th>
                    <th>Entry</th>
                    <th>Duration (live)</th>
                    {canShowOperator && <th>Operator</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="empty-row">
                      <td colSpan={canShowOperator ? 5 : 4}>Loading data from database...</td>
                    </tr>
                  ) : recentThree.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan={canShowOperator ? 5 : 4}>No vehicles recorded entering yet.</td>
                    </tr>
                  ) : (
                    recentThree.map((entry) => {
                      return (
                        <tr key={entry.id}>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{entry.plate}</td>
                          <td>{TYPE_LABELS[entry.type]}</td>
                          <td>{formatTime(entry.entryAt)}</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{formatStopwatch(entry.entryAt, now)}</td>
                          {canShowOperator && (
                            <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-secondary)' }}>
                              {entry.entryBy != null ? `#${entry.entryBy}` : '-'}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {history.length > 0 && (
              <>
                <div className="section-header-row" style={{ marginTop: '28px' }}>
                  <h3 className="parkir-section-title">Recent History</h3>
                </div>
                <div className="table-container" style={{ marginTop: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Plate</th>
                        <th>Exit</th>
                        <th>Paid</th>
                        {canShowOperator && <th>Operator</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 3).map((h) => (
                        <tr key={h.id}>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{h.plate}</td>
                          <td>{formatTime(h.exitAt)}</td>
                          <td style={{ fontWeight: 700 }}>{formatRupiah(h.fee)}</td>
                          {canShowOperator && (
                            <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-secondary)' }}>
                              {h.exitBy != null ? `#${h.exitBy}` : h.entryBy != null ? `#${h.entryBy}` : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="parkir-split-right">
            <div className="parkir-panel">
              <h3 className="parkir-panel-title">Vehicle Entry Input</h3>
              <form className="parkir-form-vertical" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">License Plate Number</label>
                  <input
                    type="text"
                    className="simulator-input"
                    placeholder="B 1234 XYZ"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <div className="seg-control seg-full">
                    <button
                      type="button"
                      className={`seg-btn ${type === 'Roda 2' ? 'active' : ''}`}
                      onClick={() => setType('Roda 2')}
                    >
                      2 Wheels
                    </button>
                    <button
                      type="button"
                      className={`seg-btn ${type === 'Roda 4' ? 'active' : ''}`}
                      onClick={() => setType('Roda 4')}
                    >
                      4 Wheels
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary btn-parkir-submit">
                  Record Entry
                </button>
              </form>

              <div className="parkir-tariff">
                <button
                  type="button"
                  className="tariff-toggle-btn"
                  onClick={() => setTariffOpen(true)}
                >
                  <Tag size={15} />
                  Tarif Parkir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'keluar' && (
        <div className="parkir-split parkir-split-exit">
          <div className="parkir-split-left">
            <div className="section-header-row">
              <h3 className="parkir-section-title">
                <MousePointerClick size={16} /> Vehicles Currently Inside
              </h3>
              <span className="current-time">{formatDate(now)} &mdash; {formatTime(now)}</span>
            </div>
            <p className="tariff-note" style={{ border: 'none', padding: 0, margin: '0 0 14px' }}>
              Click a vehicle row to fill the exit form on the right.
            </p>

            <div className="filter-bar">
              <Search size={15} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="search-input filter-search"
                placeholder="Search plate number..."
                value={search}
                onChange={(e) => handleExitSearch(e.target.value)}
              />
              <Select
                value={typeFilter}
                onChange={(v) => handleExitTypeFilter(v as 'Semua' | VehicleType)}
                ariaLabel="Filter vehicle type"
                options={[
                  { value: 'Semua', label: 'All Types' },
                  { value: 'Roda 2', label: '2 Wheels' },
                  { value: 'Roda 4', label: '4 Wheels' },
                ]}
              />
              <Select
                value={durationFilter}
                onChange={(v) => handleExitDurationFilter(v as typeof durationFilter)}
                ariaLabel="Filter by parking duration"
                options={[
                  { value: 'all', label: 'All Durations' },
                  { value: 'lt1h', label: 'Under 1 Hour' },
                  { value: 'h1to3', label: '1 - 3 Hours' },
                  { value: 'gt3h', label: 'Over 3 Hours' },
                ]}
              />
            </div>

            <div className="data-scroll">
            <div className="table-container" style={{ marginTop: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Plate Number</th>
                    <th>Type</th>
                    <th>Entry Time</th>
                    <th>Duration (live)</th>
                    <th>Current Fee</th>
                    {canShowOperator && <th>Operator</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="empty-row">
                      <td colSpan={canShowOperator ? 6 : 5}>Loading data from database...</td>
                    </tr>
                  ) : filteredExit.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan={canShowOperator ? 6 : 5}>No vehicles match your search.</td>
                    </tr>
                  ) : (
                    pagedExit.map((entry) => {
                      const { fee } = calcFee(entry.entryAt, now, entry.type);
                      const selected = exitVehicle?.id === entry.id;
                      return (
                        <tr
                          key={entry.id}
                          className={`row-clickable ${selected ? 'row-selected' : ''}`}
                          onClick={() => selectExit(entry)}
                        >
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{entry.plate}</td>
                          <td>{TYPE_LABELS[entry.type]}</td>
                          <td>{formatTime(entry.entryAt)}</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{formatStopwatch(entry.entryAt, now)}</td>
                          <td style={{ fontWeight: 700 }} className={fee === 0 ? 'fee-free' : undefined}>
                            {fee === 0 ? 'Free' : formatRupiah(fee)}
                          </td>
                          {canShowOperator && (
                            <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-secondary)' }}>
                              {entry.entryBy != null ? `#${entry.entryBy}` : '-'}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </div>

            <div className="table-footer">
              <span className="table-footer-info">
                Showing {filteredExit.length === 0 ? 0 : exitStartIdx + 1}&ndash;{exitStartIdx + pagedExit.length} of {filteredExit.length} vehicles
              </span>
              <Pagination page={exitCurrentPage} totalPages={exitTotalPages} onPageChange={setExitPage} />
            </div>
          </div>

          <div className="parkir-split-right">
            <div className="parkir-panel">
              <h3 className="parkir-panel-title">Vehicle Exit Input</h3>
              {!exitVehicle ? (
                <p className="tariff-note" style={{ border: 'none', padding: '12px 0 4px', margin: 0 }}>
                  Select a vehicle from the list to process payment at exit.
                </p>
              ) : (
                <form className="parkir-form-vertical" onSubmit={confirmExit}>
                  <div className="checkout-plate">{exitVehicle.plate}</div>
                  <div className="checkout-meta">
                    {TYPE_LABELS[exitVehicle.type]} &middot; Entered {formatTime(exitVehicle.entryAt)}
                  </div>
                  <div className="checkout-live">
                    <span className="checkout-live-val">{formatStopwatch(exitVehicle.entryAt, now)}</span>
                    <span className="checkout-live-lbl">Duration (running realtime)</span>
                  </div>
                  <div className="form-group">
                    <span className="form-label">Fee Due</span>
                    <div className="exit-fee">
                      <span>{exitFee === 0 ? 'Free' : formatRupiah(exitFee)}</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="exitPay">Amount Paid by Customer</label>
                    <input
                      id="exitPay"
                      type="number"
                      min={0}
                      step={500}
                      className="simulator-input"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className={`exit-change ${exitChange > 0 ? 'positive' : ''}`}>
                    <span>{exitChange > 0 ? 'Change to give back' : 'Change to give back'}</span>
                    <b>
                      {exitChange > 0
                        ? formatRupiah(exitChange)
                        : paidAmount > 0 && paidAmount < exitFee
                          ? `Still short ${formatRupiah(exitFee - paidAmount)}`
                          : '—'}
                    </b>
                  </div>
                  <div className="exit-actions">
                    <button type="button" className="btn-cancel" onClick={() => { setExitVehicle(null); setPayAmount(''); }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary btn-parkir-submit" disabled={exitFee > 0 && paidAmount < exitFee}>
                      Confirm Exit
                    </button>
                  </div>
                </form>
              )}

              <div className="parkir-tariff">
                <button
                  type="button"
                  className="tariff-toggle-btn"
                  onClick={() => setTariffOpen(true)}
                >
                  <Tag size={15} />
                  Tarif Parkir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tariffOpen && (
        <Modal title="Tarif Parkir" onClose={() => setTariffOpen(false)}>
          <div className="tariff-modal-list">
            <div className="tariff-row">
              <span>4 Wheels — first 2 hours</span>
              <b>Rp 5.000</b>
            </div>
            <div className="tariff-row">
              <span>4 Wheels — every next hour</span>
              <b>Rp 2.000</b>
            </div>
            <div className="tariff-row">
              <span>2 Wheels — first 2 hours</span>
              <b>Rp 3.000</b>
            </div>
            <div className="tariff-row">
              <span>2 Wheels — every next hour</span>
              <b>Rp 2.000</b>
            </div>
            <div className="tariff-row free">
              <Clock size={13} />
              <span>Free for under 15 minutes</span>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-primary btn-parkir-submit" onClick={() => setTariffOpen(false)}>
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ParkirView;
