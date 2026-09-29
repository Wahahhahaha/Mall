import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PageDef } from '../../../permissionPages';
import { PERMISSION_PAGES } from '../../../permissionPages';
import Modal from '../../../components/Modal';
import { useConfirm } from '../../../components/ConfirmDialog';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';
import { buildMeta } from '../../../utils/meta';

interface LevelRow {
  levelid: number;
  levelname: string;
  _count?: { users: number };
}

interface PermissionRow {
  levelid: number;
  page: string;
  action: string;
  granted: boolean;
}

const emptyLevelForm = { levelname: '' };

function PermissionView() {
  const { askConfirm, confirmDialog } = useConfirm();
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [matrix, setMatrix] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyLevelForm);
  const [deleteTarget, setDeleteTarget] = useState<LevelRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const keyOf = (page: string, action: string, levelid: number) => `${page}.${action}:${levelid}`;

  const getVal = (page: string, action: string, levelid: number) =>
    matrix[keyOf(page, action, levelid)] ?? action === 'view';

  const toggle = async (page: string, action: string, levelid: number) => {
    const key = keyOf(page, action, levelid);
    const newVal = !getVal(page, action, levelid);
    // optimistic update
    setMatrix((prev) => ({ ...prev, [key]: newVal }));
    try {
      const permissions = PERMISSION_PAGES.flatMap((p) =>
        p.actions.map((a) => {
          const k = keyOf(p.key, a.key, levelid);
          const granted = k === key ? newVal : getVal(p.key, a.key, levelid);
          return { page: p.key, action: a.key, granted };
        }),
      );
      await axios.put(`${BACKEND_URL}/permissions/${levelid}`, {
        permissions,
        meta: await buildMeta(),
      });
      toast('Permission updated');
    } catch {
      // revert on failure
      setMatrix((prev) => ({ ...prev, [key]: !newVal }));
      toast('Failed to save permission');
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      axios.get<LevelRow[]>(`${BACKEND_URL}/levels`),
      axios.get<PermissionRow[]>(`${BACKEND_URL}/permissions`),
    ])
      .then(([levelsRes, permsRes]) => {
        if (ignore) return;
        const data = levelsRes.data;
        const perms = permsRes.data;
        setLevels(data);
        setMatrix(() => {
          const next: Record<string, boolean> = {};
          PERMISSION_PAGES.forEach((p) =>
            p.actions.forEach((a) =>
              data.forEach((lvl) => {
                next[keyOf(p.key, a.key, lvl.levelid)] = a.key === 'view';
              }),
            ),
          );
          perms.forEach((perm) => {
            const k = keyOf(perm.page, perm.action, perm.levelid);
            if (k in next) next[k] = perm.granted;
          });
          return next;
        });
        setLoading(false);
      })
      .catch(() => {
        if (!ignore) {
          toast('Failed to load permission data from server.');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const openAdd = () => {
    setForm(emptyLevelForm);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (level: LevelRow) => {
    setForm({ levelname: level.levelname });
    setEditId(level.levelid);
    setDeleteTarget(level);
    setModalOpen(true);
  };

  const handleDelete = async (level: LevelRow) => {
    setDeleteTarget(null);
    try {
      await axios.delete(`${BACKEND_URL}/levels/${level.levelid}`, {
        data: { meta: await buildMeta() },
      });
      toast('Level deleted');
      refresh();
    } catch {
      toast('Failed to delete level.');
    }
  };

  const askDelete = (level: LevelRow) => {
    askConfirm({
      title: 'Delete Level',
      message: (
        <>
          Delete level <strong>{level.levelname}</strong>? All of its permission settings and users
          assigned to it will be affected.
        </>
      ),
      confirmLabel: 'Delete',
      onConfirm: () => handleDelete(level),
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.levelname) return;
    try {
      if (editId !== null) {
        await axios.patch(`${BACKEND_URL}/levels/${editId}`, form);
      } else {
        await axios.post(`${BACKEND_URL}/levels`, form);
      }
      setModalOpen(false);
      toast('Level saved successfully');
      refresh();
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to save level.';
      toast(message);
    }
  };

  const colSpan = levels.length + 1;

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header">
        <div>
          <h2 className="welcome-title"><Lock size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Permission Matrix</h2>
          <p className="welcome-text">Configure page access for each user level. Views are on by default.</p>
        </div>
        <div className="data-page-actions">
          <button className="btn-add" onClick={openAdd}>
            <Plus size={15} /> Add Level
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Menu / Feature</th>
              {levels.map((lvl) => (
                <th key={lvl.levelid} className="cell-center">
                  <span className="permission-th">
                    {lvl.levelname}
                    <button className="btn-icon-action edit" onClick={() => openEdit(lvl)} title="Rename / delete level" aria-label={`Edit ${lvl.levelname}`}>
                      <Pencil size={12} />
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row">
                <td colSpan={colSpan}>Loading data from database...</td>
              </tr>
            ) : levels.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={colSpan}>No levels available.</td>
              </tr>
            ) : (
              PERMISSION_PAGES.map((page) => (
                <PageGroup
                  key={page.key}
                  page={page}
                  levels={levels}
                  getVal={(action, levelid) => getVal(page.key, action, levelid)}
                  onToggle={(action, levelid) => toggle(page.key, action, levelid)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title={editId !== null ? `Rename Level` : 'Add Level'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Level Name</label>
              <input
                type="text"
                className="form-input"
                value={form.levelname}
                onChange={(e) => setForm({ ...form, levelname: e.target.value })}
                placeholder="e.g. Security"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              {editId !== null && (
                <button
                  type="button"
                  className="btn-danger btn-danger-icon"
                  title="Delete level"
                  aria-label="Delete level"
                  onClick={() => {
                    if (deleteTarget) {
                      setModalOpen(false);
                      askDelete(deleteTarget);
                    }
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
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

function PageGroup({
  page,
  levels,
  getVal,
  onToggle,
}: {
  page: PageDef;
  levels: LevelRow[];
  getVal: (action: string, levelid: number) => boolean;
  onToggle: (action: string, levelid: number) => void;
}) {
  const Icon = page.icon;
  return (
    <>
      <tr className="permission-group-row">
        <td colSpan={levels.length + 1}>
          <span className="permission-group-label">
            <Icon size={14} />
            {page.label}
          </span>
        </td>
      </tr>
      {page.actions.map((action) => (
        <tr key={action.key}>
          <td className="permission-action-cell">{action.label}</td>
          {levels.map((lvl) => (
            <td key={`${page.key}-${action.key}-${lvl.levelid}`} className="cell-center">
              <button
                type="button"
                className={`toggle-switch ${getVal(action.key, lvl.levelid) ? 'on' : ''}`}
                onClick={() => onToggle(action.key, lvl.levelid)}
                role="switch"
                aria-checked={getVal(action.key, lvl.levelid)}
                aria-label={`${page.label} - ${action.label} - ${lvl.levelname}`}
              >
                <span className="toggle-knob" />
              </button>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default PermissionView;