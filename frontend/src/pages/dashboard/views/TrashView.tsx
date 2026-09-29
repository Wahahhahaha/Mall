import { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, Trash2, RotateCcw, Trash } from 'lucide-react';
import Select from '../../../components/Select';
import Pagination from '../../../components/Pagination';
import { useConfirm } from '../../../components/ConfirmDialog';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';

interface TrashItem {
  entityType: string;
  entityLabel: string;
  entityId: number;
  name: string;
  createdAt: string | null;
}

const PAGE_SIZE = 20;

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function TrashView() {
  const { askConfirm, confirmDialog } = useConfirm();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [types, setTypes] = useState<{ type: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<{ type: string; label: string }[]>(`${BACKEND_URL}/trash/types`)
      .then((res) => setTypes(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    axios
      .get<TrashItem[]>(`${BACKEND_URL}/trash`, {
        params: typeFilter ? { entityType: typeFilter } : undefined,
      })
      .then((res) => {
        if (!ignore) {
          setItems(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast('Failed to load trash from server.');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [typeFilter, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  const keyOf = (item: TrashItem) => `${item.entityType}:${item.entityId}`;
  const drop = (item: TrashItem) =>
    setItems((prev) => prev.filter((x) => keyOf(x) !== keyOf(item)));

  const handleTypeFilterChange = (v: string) => {
    setLoading(true);
    setTypeFilter(v);
    setPage(1);
  };

  const handleRestore = async (item: TrashItem) => {
    setBusy(keyOf(item));
    try {
      await axios.post(`${BACKEND_URL}/trash/${item.entityType}/${item.entityId}/restore`);
      toast('Item restored');
      drop(item);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to restore item.';
      toast(msg);
    } finally {
      setBusy(null);
    }
  };

  const handlePurge = async (item: TrashItem) => {
    setBusy(keyOf(item));
    try {
      await axios.delete(`${BACKEND_URL}/trash/${item.entityType}/${item.entityId}`);
      toast('Item deleted permanently');
      drop(item);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete item.';
      toast(msg);
    } finally {
      setBusy(null);
    }
  };

  const askRestore = (item: TrashItem) => {
    askConfirm({
      title: 'Restore Item',
      message: (
        <>
          Restore <strong>{item.name}</strong> ({item.entityLabel}) back into the database?
        </>
      ),
      confirmLabel: 'Restore',
      tone: 'primary',
      onConfirm: () => handleRestore(item),
    });
  };

  const askPurge = (item: TrashItem) => {
    askConfirm({
      title: 'Permanently Delete',
      message: (
        <>
          Permanently delete <strong>{item.name}</strong>? This cannot be undone — the row will be
          removed from the database.
        </>
      ),
      confirmLabel: 'Delete Permanently',
      onConfirm: () => handlePurge(item),
    });
  };

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header">
        <div>
          <h2 className="welcome-title">
            <Trash size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Trash
          </h2>
          <p className="welcome-text">
            Deleted master data is moved here. Restore an item to bring it back, or delete it
            permanently.
          </p>
        </div>
        <div className="data-page-actions">
          <Select
            value={typeFilter}
            onChange={handleTypeFilterChange}
            ariaLabel="Filter by type"
            options={[
              { value: '', label: 'All Types' },
              ...types.map((t) => ({ value: t.type, label: t.label })),
            ]}
          />
          <button className="btn-secondary" onClick={() => { setLoading(true); setRefreshKey((k) => k + 1); }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div className="data-scroll">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name / ID</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row">
                  <td colSpan={4}>Loading trash...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={4}>Trash is empty.</td>
                </tr>
              ) : (
                paged.map((item) => (
                  <tr key={keyOf(item)}>
                    <td>
                      <span className="status-badge solid">{item.entityLabel}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        #{item.entityId}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>
                      {formatTime(item.createdAt)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn-icon-action edit"
                          onClick={() => askRestore(item)}
                          disabled={busy === keyOf(item)}
                          title="Restore item"
                          aria-label="Restore"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          className="btn-icon-action delete"
                          onClick={() => askPurge(item)}
                          disabled={busy === keyOf(item)}
                          title="Delete permanently"
                          aria-label="Delete permanently"
                        >
                          <Trash2 size={14} />
                        </button>
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
          Showing {items.length === 0 ? 0 : startIdx + 1}&ndash;{startIdx + paged.length} of{' '}
          {items.length} items
        </span>
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {confirmDialog}
    </div>
  );
}

export default TrashView;
