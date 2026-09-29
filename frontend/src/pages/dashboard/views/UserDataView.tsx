import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Plus, RotateCcw, Trash2, Users } from 'lucide-react';
import Modal from '../../../components/Modal';
import Select from '../../../components/Select';
import SearchBar from '../../../components/SearchBar';
import Pagination from '../../../components/Pagination';
import { useConfirm } from '../../../components/ConfirmDialog';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';
import { buildMeta } from '../../../utils/meta';

interface UserRow {
  userid: number;
  email: string;
  levelid: number;
  level: { levelid: number; levelname: string };
}

interface LevelOption {
  levelid: number;
  levelname: string;
}

const DEFAULT_PASSWORD = '12345678';

const emptyForm = {
  email: '',
  levelid: '',
};

const PAGE_SIZE = 20;

function UserDataView() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const { askConfirm, confirmDialog } = useConfirm();

  useEffect(() => {
    let ignore = false;
    Promise.all([
      axios.get<UserRow[]>(`${BACKEND_URL}/users`),
      axios.get<LevelOption[]>(`${BACKEND_URL}/levels`),
    ])
      .then(([userRes, levelRes]) => {
        if (!ignore) {
          setUsers(userRes.data);
          setLevels(levelRes.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast('Failed to load user data from server.');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const filtered = users.filter((u) => {
    const matchSearch = Object.values({ userid: u.userid, email: u.email, levelname: u.level?.levelname }).some(
      (v) => String(v).toLowerCase().includes(search.toLowerCase())
    );
    const matchLevel = !levelFilter || String(u.levelid) === levelFilter;
    return matchSearch && matchLevel;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleLevelFilterChange = (value: string) => {
    setLevelFilter(value);
    setPage(1);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (user: UserRow) => {
    setForm({
      email: user.email,
      levelid: String(user.levelid),
    });
    setEditId(user.userid);
    setModalOpen(true);
  };

  const handleDelete = async (user: UserRow) => {
    try {
      await axios.delete(`${BACKEND_URL}/users/${user.userid}`, {
        data: { meta: await buildMeta() },
      });
      toast('User deleted');
      refresh();
    } catch {
      toast('Failed to delete user.');
    }
  };

  const askDelete = (user: UserRow) => {
    askConfirm({
      title: 'Delete User',
      message: (
        <>
          Are you sure you want to delete <strong>{user.email}</strong>? The account will be removed
          permanently.
        </>
      ),
      confirmLabel: 'Delete',
      onConfirm: () => handleDelete(user),
    });
  };

  const handleResetPassword = async (user: UserRow) => {
    try {
      await axios.patch(`${BACKEND_URL}/users/${user.userid}/reset-password`);
      toast(`Password for ${user.email} reset to ${DEFAULT_PASSWORD}`);
    } catch {
      toast('Failed to reset password.');
    }
  };

  const askResetPassword = (user: UserRow) => {
    askConfirm({
      title: 'Reset Password',
      message: (
        <>
          Reset the password of <strong>{user.email}</strong> back to the default{' '}
          <strong>{DEFAULT_PASSWORD}</strong>?
        </>
      ),
      confirmLabel: 'Reset Password',
      onConfirm: () => handleResetPassword(user),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.levelid) return;
    try {
      if (editId !== null) {
        await axios.patch(`${BACKEND_URL}/users/${editId}`, {
          email: form.email,
          levelid: Number(form.levelid),
        });
        setModalOpen(false);
        toast('User saved successfully');
      } else {
        await axios.post(`${BACKEND_URL}/users`, {
          email: form.email,
          password: DEFAULT_PASSWORD,
          levelid: Number(form.levelid),
        });
        setModalOpen(false);
        toast(`User created with default password ${DEFAULT_PASSWORD}`);
      }
      refresh();
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to save user.';
      toast(message);
    }
  };

  return (
    <div className="simulator-panel user-data-view" style={{ marginTop: 0 }}>
      <div className="data-page-header data-actions-stack">
        <div>
          <h2 className="welcome-title"><Users size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> User Data</h2>
          <p className="welcome-text">Users registered in the SIM Mall system.</p>
        </div>
        <div className="data-page-actions">
          <SearchBar value={search} onChange={handleSearchChange} placeholder="Search users..." />
          <Select
            value={levelFilter}
            onChange={handleLevelFilterChange}
            ariaLabel="Filter by level"
            options={[{ value: '', label: 'All Levels' }, ...levels.map((lvl) => ({ value: String(lvl.levelid), label: lvl.levelname }))]}
          />
          <button className="btn-add" onClick={openAdd}>
            <Plus size={15} /> Add User
          </button>
        </div>
      </div>

      <div className="data-scroll">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Level</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row">
                <td colSpan={3}>Loading data from database...</td>
              </tr>
            ) : paged.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={3}>No users match your search.</td>
              </tr>
            ) : (
              paged.map((u) => (
                <tr key={u.userid}>
                  <td className="user-email" style={{ fontWeight: 600 }}>{u.email}</td>
                  <td className="user-level">{u.level?.levelname || '-'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon-action edit" onClick={() => openEdit(u)} title="Edit" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn-icon-action reset" onClick={() => askResetPassword(u)} title={`Reset password to ${DEFAULT_PASSWORD}`} aria-label="Reset password">
                        <RotateCcw size={14} />
                      </button>
                      <button className="btn-icon-action delete" onClick={() => askDelete(u)} title="Delete" aria-label="Delete">
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
          Showing {filtered.length === 0 ? 0 : startIdx + 1}&ndash;{startIdx + paged.length} of {filtered.length} entries
        </span>
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {modalOpen && (
        <Modal
          title={editId !== null ? `Edit User #${editId}` : 'Add User'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. cashier@mall.com"
                autoComplete="off"
              />
            </div>
            {editId === null && (
              <p className="form-hint">
                Password is generated automatically: <strong>{DEFAULT_PASSWORD}</strong>. The user can
                change it later from the profile page.
              </p>
            )}
            <div className="form-group">
              <label className="form-label">Level</label>
              <Select
                value={form.levelid}
                onChange={(v) => setForm({ ...form, levelid: v })}
                ariaLabel="Select level"
                options={[{ value: '', label: '- Select Level -' }, ...levels.map((lvl) => ({ value: String(lvl.levelid), label: lvl.levelname }))]}
              />
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

      {confirmDialog}
    </div>
  );
}

export default UserDataView;
