import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { ClipboardList, Check, X, Eye, RefreshCw, Mail, Phone, MapPin, CalendarDays } from 'lucide-react';
import Modal from '../../../components/Modal';
import SearchBar from '../../../components/SearchBar';
import Select from '../../../components/Select';
import Pagination from '../../../components/Pagination';
import { useConfirm } from '../../../components/ConfirmDialog';
import { toast } from '../../../components/toastBus';
import { usePermissions } from '../../../permissionBus';
import { BACKEND_URL } from '../../../config';

interface RequestLocation {
  id: number;
  name: string;
  pricePerYear: number | null;
  floor?: { floorid: number; floorname: string } | null;
}

interface RequestUser {
  userid: number;
  email: string;
}

interface RequestRow {
  id: number;
  status: string;
  userid: number;
  locationid: number;
  businessName: string;
  businessCategory: string;
  description: string | null;
  phone: string | null;
  durationMonths: number;
  totalFee: number;
  monthlyFee: number;
  contractStart: string | null;
  createdAt: string;
  location: RequestLocation | null;
  user: RequestUser | null;
}

const PAGE_SIZE = 20;
const STATUS_ORDER = ['Pending', 'Approved', 'Paid', 'Active', 'Rejected'];
const STATUS_CLASS: Record<string, string> = {
  Pending: 'pending',
  Approved: 'approved',
  Paid: 'paid',
  Active: 'active',
  Rejected: 'rejected',
};

const money = (v: number) => `Rp ${Math.round(v).toLocaleString('id-ID')}`;
const dayOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const statusClass = (s: string) => STATUS_CLASS[s] ?? 'outline';
const unitLabel = (r: RequestRow) =>
  r.location ? (r.location.floor ? `${r.location.name} — ${r.location.floor.floorname}` : r.location.name) : 'Unassigned unit';

function LeaseRequestsView() {
  const { askConfirm, confirmDialog } = useConfirm();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [detail, setDetail] = useState<RequestRow | null>(null);
  const perms = usePermissions();

  useEffect(() => {
    let ignore = false;
    axios
      .get<RequestRow[]>(`${BACKEND_URL}/tenant-requests`)
      .then((r) => {
        if (!ignore) setRows(r.data);
      })
      .catch(() => {
        if (!ignore) toast('Failed to load lease requests');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return map;
  }, [rows]);
  const pendingCount = counts.get('Pending') ?? 0;

  const statusOptions = useMemo(() => {
    const ordered = STATUS_ORDER.filter((s) => counts.has(s));
    const rest = Array.from(counts.keys()).filter((s) => !STATUS_ORDER.includes(s));
    return [
      { value: '', label: `All statuses (${rows.length})` },
      ...[...ordered, ...rest].map((s) => ({ value: s, label: `${s} (${counts.get(s) ?? 0})` })),
    ];
  }, [counts, rows.length]);

  const query = search.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchSearch =
      !query ||
      [
        r.businessName,
        r.businessCategory,
        r.location?.name ?? '',
        r.location?.floor?.floorname ?? '',
        r.user?.email ?? '',
        r.description ?? '',
      ].some((v) => v.toLowerCase().includes(query));
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  const refresh = () => setRefreshKey((k) => k + 1);
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleStatusFilter = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };

  const changeStatus = (row: RequestRow, next: 'Approved' | 'Rejected') => {
    const approving = next === 'Approved';
    askConfirm({
      title: approving ? 'Approve lease request' : 'Reject lease request',
      message: approving
        ? `Approve ${row.businessName} for ${row.location?.name ?? 'this unit'}? The unit is occupied, the first invoice is raised and the applicant is emailed.`
        : `Reject the request from ${row.businessName}? The unit stays available and the applicant is notified.`,
      confirmLabel: approving ? 'Approve' : 'Reject',
      tone: approving ? 'primary' : 'danger',
      onConfirm: async () => {
        setBusy(row.id);
        try {
          await axios.patch(`${BACKEND_URL}/tenant-requests/${row.id}/status`, { status: next });
          toast(
            approving
              ? `Approved — ${row.businessName} now occupies ${row.location?.name ?? 'the unit'}`
              : `Request from ${row.businessName} rejected`,
          );
          setDetail(null);
          refresh();
        } catch (err) {
          const msg =
            axios.isAxiosError(err) && err.response?.data?.message
              ? String(err.response.data.message)
              : 'Failed to update the request';
          toast(msg);
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const openDetail = (row: RequestRow) => setDetail(row);

  const detailRow = (label: string, value: ReactNode) => (
    <div className="lease-detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header">
        <div>
          <h2 className="welcome-title">
            <ClipboardList size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Lease Requests
            {pendingCount > 0 && <span className="status-badge pending" style={{ marginLeft: '10px' }}>{pendingCount} pending</span>}
          </h2>
          <p className="welcome-text">
            Applications submitted from the tenant portal. Approving occupies the unit, raises the first
            invoice and emails the applicant.
          </p>
        </div>
        <div className="data-page-actions">
          <SearchBar value={search} onChange={handleSearch} placeholder="Search applicant, unit, category..." />
          <Select value={statusFilter} onChange={handleStatusFilter} ariaLabel="Filter by status" options={statusOptions} />
          <button className="btn-secondary" onClick={() => { setLoading(true); refresh(); }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div className="data-scroll">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Unit</th>
                <th>Contract</th>
                <th>Total Fee</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row">
                  <td colSpan={7}>Loading lease requests...</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={7}>{rows.length === 0 ? 'No lease requests yet.' : 'No requests match your filters.'}</td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.businessName}</div>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {row.businessCategory} · {row.user?.email ?? `user #${row.userid}`}
                      </div>
                    </td>
                    <td>
                      <div>{unitLabel(row)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {row.monthlyFee > 0 ? `${money(row.monthlyFee)}/month` : 'Price not set'}
                      </div>
                    </td>
                    <td>
                      <div>{row.durationMonths} months</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        starts {dayOf(row.contractStart)}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{money(row.totalFee)}</td>
                    <td>
                      <span className={`status-badge ${statusClass(row.status)}`}>{row.status}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{dayOf(row.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn-icon-action"
                          onClick={() => openDetail(row)}
                          title="View details"
                          aria-label="View details"
                        >
                          <Eye size={14} />
                        </button>
                        {row.status === 'Pending' && (
                          <>
                            {perms.can('lease-requests', 'approve') && (
                              <button
                                className="btn-icon-action approve"
                                onClick={() => changeStatus(row, 'Approved')}
                                disabled={busy === row.id}
                                title="Approve request"
                                aria-label="Approve request"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            {perms.can('lease-requests', 'reject') && (
                              <button
                                className="btn-icon-action reject"
                                onClick={() => changeStatus(row, 'Rejected')}
                                disabled={busy === row.id}
                                title="Reject request"
                                aria-label="Reject request"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-footer">
        <span className="table-footer-info">
          Showing {filtered.length === 0 ? 0 : startIdx + 1}&ndash;{startIdx + paged.length} of {filtered.length} requests
        </span>
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {detail && (
        <Modal title="Lease request details" onClose={() => setDetail(null)}>
          <div className="lease-detail-head">
            <div>
              <div className="lease-detail-title">{detail.businessName}</div>
              <div className="lease-detail-sub">
                {detail.businessCategory} · submitted {dayOf(detail.createdAt)}
              </div>
            </div>
            <span className={`status-badge ${statusClass(detail.status)}`}>{detail.status}</span>
          </div>

          <dl className="lease-detail-grid">
            {detailRow(
              'Applicant',
              <span className="lease-detail-inline">
                <Mail size={13} /> {detail.user?.email ?? `user #${detail.userid}`}
              </span>,
            )}
            {detail.phone &&
              detailRow(
                'Phone',
                <span className="lease-detail-inline">
                  <Phone size={13} /> {detail.phone}
                </span>,
              )}
            {detailRow(
              'Unit',
              <span className="lease-detail-inline">
                <MapPin size={13} /> {unitLabel(detail)}
              </span>,
            )}
            {detailRow(
              'Contract',
              <span className="lease-detail-inline">
                <CalendarDays size={13} /> {detail.durationMonths} months from {dayOf(detail.contractStart)}
              </span>,
            )}
            {detailRow('Monthly fee', money(detail.monthlyFee))}
            {detailRow('Contract total', money(detail.totalFee))}
          </dl>

          {detail.description && (
            <div className="lease-detail-note">
              <span>Business description</span>
              <p>{detail.description}</p>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setDetail(null)}>
              Close
            </button>
            {detail.status === 'Pending' && (
              <>
                {perms.can('lease-requests', 'reject') && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => changeStatus(detail, 'Rejected')}
                    disabled={busy === detail.id}
                  >
                    Reject
                  </button>
                )}
                {perms.can('lease-requests', 'approve') && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => changeStatus(detail, 'Approved')}
                    disabled={busy === detail.id}
                  >
                    Approve
                  </button>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {confirmDialog}
    </div>
  );
}

export default LeaseRequestsView;
