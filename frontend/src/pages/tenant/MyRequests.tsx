import { useEffect, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../config';
import { ClipboardList, Wallet, Calendar, CreditCard, Store, Trash2, Clock } from 'lucide-react';
import { toast } from '../../components/toastBus';

interface Req {
  id: number;
  durationMonths: number;
  totalFee: number;
  paymentMethod: string | null;
  businessName: string;
  businessCategory: string;
  description: string | null;
  phone: string | null;
  status: string;
  contractStart: string | null;
  createdAt: string;
  monthlyFee: number;
  location: { id: number; name: string; pricePerYear: number | null; floor?: { floorname: string } | null };
}

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const PAYMENT_LABELS: Record<string, string> = { 'Transfer Bank': 'Bank Transfer', 'Cash di Kantor': 'Cash at Office' };
const paymentLabel = (m: string | null) => (m ? (PAYMENT_LABELS[m] ?? m) : 'After approval (Midtrans)');
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function MyRequests() {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      if (!user) return;
      const res = await axios.get<Req[]>(`${BACKEND_URL}/tenant-requests`, { params: { userid: user.userid } });
      setReqs(res.data);
    } catch { toast('Failed to load requests'); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Cancel this request?')) return;
    try { await axios.delete(`${BACKEND_URL}/tenant-requests/${id}`); toast('Request cancelled'); fetch(); } catch { toast('Something went wrong'); }
  };

  return (
    <div className="tenant-page">
      <h1 className="tenant-title"><ClipboardList size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> My Requests</h1>
      <p className="tenant-sub">Every lease request you have submitted. Status is updated by the admin (Pending → Approved/Rejected).</p>

      {loading ? <p className="welcome-text">Loading...</p> : reqs.length === 0 ? (
        <div className="landing-empty">No requests yet. Apply for a unit on the Browse Units page.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reqs.map(r => (
            <article key={r.id} style={{ border: '1px solid rgba(186,230,253,0.6)', borderRadius: 16, padding: 16, background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 4px 16px rgba(2,132,199,0.08), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="status-badge solid" style={{ background: '#111' }}><Store size={10} /> {r.location.name}</span>
                    <span className="status-badge outline">{r.location.floor?.floorname ?? '-'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span><Store size={11} /> {r.businessName} · {r.businessCategory || 'General'}</span>
                    <span>· {r.phone ?? '-'}</span>
                  </div>
                </div>
                <span className={`status-badge ${r.status === 'Approved' ? 'solid' : r.status === 'Rejected' ? 'outline' : 'outline'}`} style={{ background: r.status === 'Approved' ? '#16a34a' : r.status === 'Pending' ? '#fff' : undefined, color: r.status === 'Approved' ? '#fff' : undefined, borderColor: r.status === 'Pending' ? '#f59e0b' : undefined }}>
                  {r.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, background: 'rgba(240,249,255,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(186,230,253,0.55)', borderRadius: 10, padding: 12 }}>
                <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', display: 'flex', gap: 4, alignItems: 'center' }}><Calendar size={11} /> Duration</div><b style={{ fontSize: 13 }}>{r.durationMonths} months</b></div>
                <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', display: 'flex', gap: 4, alignItems: 'center' }}><Wallet size={11} /> Total Cost</div><b style={{ fontSize: 13 }}>{formatRupiah(r.totalFee)}</b><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.monthlyFee ? `${formatRupiah(r.monthlyFee)}/mo` : ''}</div></div>
                <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', display: 'flex', gap: 4, alignItems: 'center' }}><CreditCard size={11} /> Payment</div><b style={{ fontSize: 13 }}>{paymentLabel(r.paymentMethod)}</b></div>
                <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', display: 'flex', gap: 4, alignItems: 'center' }}><Clock size={11} /> Contract Start</div><b style={{ fontSize: 13 }}>{fmtDate(r.contractStart)}</b><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Submitted {fmtDate(r.createdAt)}</div></div>
              </div>

              {r.description && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(186,230,253,0.55)', borderRadius: 10, padding: 10 }}>{r.description}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                {r.status === 'Pending' && <button type="button" className="btn-icon-action delete" onClick={() => handleDelete(r.id)} title="Cancel request"><Trash2 size={13} /> Cancel</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
