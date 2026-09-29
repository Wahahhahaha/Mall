import { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, RefreshCw } from 'lucide-react';
import SearchBar from '../../../components/SearchBar';
import Select from '../../../components/Select';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';

interface LogRow {
  id: number;
  datetime: string;
  ip: string | null;
  latitude: number | null;
  longitude: number | null;
  userid: number | null;
  email: string | null;
  role: string | null;
  action: string;
}

interface LevelOption {
  levelid: number;
  levelname: string;
}

function formatTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const PAGE_SIZE = 20;

function ActivityLogView() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    axios
      .get<LevelOption[]>(`${BACKEND_URL}/levels`)
      .then((res) => {
        if (ignore) return;
        setLevels(res.data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    axios
      .get<LogRow[]>(`${BACKEND_URL}/activity-log`, {
        params: { search: search || undefined, role: role || undefined },
      })
      .then((res) => {
        if (ignore) return;
        setLogs(res.data);
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        toast('Failed to load activity logs from server.');
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey, search, role]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = logs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleRoleChange = (v: string) => {
    setRole(v);
    setPage(1);
  };

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header data-actions-stack">
        <div>
          <h2 className="welcome-title"><Clock size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Activity Log</h2>
          <p className="welcome-text">Records of delete &amp; restore operations with user, IP and location metadata.</p>
        </div>
        <div className="data-page-actions">
          <Select
            value={role}
            onChange={handleRoleChange}
            ariaLabel="Filter by role"
            options={[
              { value: '', label: 'All Roles' },
              ...levels.map((lvl) => ({ value: lvl.levelname, label: lvl.levelname })),
            ]}
          />
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search action / user / IP..."
          />
          <button className="btn-secondary" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div className="data-scroll">
        <div className="table-container">
          <table className="data-table" style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Time</th>
                <th className="cell-center">User ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>IP</th>
                <th>Location</th>
                <th>Action / Operation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row">
                  <td colSpan={7}>Loading logs from database...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={7}>No activity logs found.</td>
                </tr>
              ) : (
                paged.map((log) => (
                  <tr key={log.id}>
                    <td>{formatTime(log.datetime)}</td>
                    <td className="cell-center">{log.userid ?? '-'}</td>
                    <td>{log.email || '-'}</td>
                    <td>{log.role || '-'}</td>
                    <td>{log.ip || '-'}</td>
                    <td>
                      {log.latitude != null && log.longitude != null
                        ? `${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}`
                        : '-'}
                    </td>
                    <td>{log.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-footer">
        <span className="table-footer-info">
          Showing {logs.length === 0 ? 0 : startIdx + 1}&ndash;{startIdx + paged.length} of {logs.length} logs
        </span>
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

export default ActivityLogView;
