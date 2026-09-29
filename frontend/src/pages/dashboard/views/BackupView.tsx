import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Database,
  Download,
  FileArchive,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from '../../../components/toastBus';
import Pagination from '../../../components/Pagination';
import { useConfirm } from '../../../components/ConfirmDialog';
import { BACKEND_URL } from '../../../config';

interface BackupRow {
  name: string;
  size: string;
  date: string;
}

function BackupView() {
  const { askConfirm, confirmDialog } = useConfirm();
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get<BackupRow[]>(`${BACKEND_URL}/backups`);
      setBackups(res.data);
    } catch {
      toast('Failed to load backups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    axios
      .get<BackupRow[]>(`${BACKEND_URL}/backups`)
      .then((res) => {
        if (!ignore) setBackups(res.data);
      })
      .catch(() => {
        if (!ignore) toast('Failed to load backups.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await axios.post<BackupRow>(`${BACKEND_URL}/backups`);
      toast(`Backup created: ${res.data.name}`);
      refresh(true);
    } catch {
      toast('Failed to create backup.');
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = (name: string) => {
    window.open(`${BACKEND_URL}/backups/${encodeURIComponent(name)}/download`, '_blank');
  };

  const deleteBackup = async (name: string) => {
    try {
      await axios.delete(`${BACKEND_URL}/backups/${encodeURIComponent(name)}`);
      toast(`Deleted ${name}`);
      refresh(true);
    } catch {
      toast('Failed to delete backup.');
    }
  };

  const askDeleteBackup = (name: string) => {
    askConfirm({
      title: 'Delete Backup',
      message: <>Delete backup file <strong>{name}</strong>? This cannot be undone.</>,
      confirmLabel: 'Delete',
      onConfirm: () => deleteBackup(name),
    });
  };

  const totalPages = Math.max(1, Math.ceil(backups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = backups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="backup-hero">
        <div className="backup-hero-icon">
          <Database size={22} />
        </div>
        <div className="backup-hero-text">
          <h2 className="welcome-title" style={{ margin: 0 }}>Database Backup</h2>
          <p className="welcome-text" style={{ margin: '6px 0 0' }}>
            Create and download real snapshots of the database, exported from the live system.
          </p>
        </div>
      </div>

      <div className="backup-actions">
        <button className="btn-primary backup-action-btn" onClick={createBackup} disabled={creating}>
          {creating ? <Loader2 size={15} className="spinner" /> : <Plus size={15} />}
          {creating ? 'Creating Backup...' : 'Create New Backup'}
        </button>
        <button className="backup-outline-btn" onClick={() => refresh()} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="data-scroll">
      <div className="backup-section-title" style={{ marginTop: 0 }}>Stored Backup Files</div>
      <div className="backup-card-list">
        {loading ? (
          <div className="backup-card" style={{ justifyContent: 'center', gap: 8 }}>
            <Loader2 size={16} className="spinner" /> Loading backups...
          </div>
        ) : backups.length === 0 ? (
          <div className="backup-card" style={{ justifyContent: 'center', color: 'var(--ink-3)' }}>
            No backups yet. Create your first backup above.
          </div>
        ) : (
          paged.map((b) => (
            <div className="backup-card" key={b.name}>
              <div className="backup-card-icon">
                <FileArchive size={18} />
              </div>
              <div className="backup-card-info">
                <div className="backup-card-name">{b.name}</div>
                <div className="backup-card-meta">
                  <span className="backup-type-tag">Database</span>
                  <span>{b.size}</span>
                  <span className="backup-date">{b.date}</span>
                </div>
              </div>
              <div className="backup-card-actions">
                <button className="backup-mini-btn" title="Download" onClick={() => downloadBackup(b.name)}>
                  <Download size={14} />
                </button>
                <button className="backup-mini-btn danger" title="Delete" onClick={() => askDeleteBackup(b.name)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      </div>

      <div className="table-footer">
        <span className="table-footer-info">
          Showing {backups.length === 0 ? 0 : startIdx + 1}&ndash;{startIdx + paged.length} of {backups.length} backups
        </span>
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {confirmDialog}
    </div>
  );
}

export default BackupView;
