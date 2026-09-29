import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BACKEND_URL } from '../../config';
import { Wallet, Receipt, CreditCard, CheckCircle2, AlertCircle, RefreshCw, Building2, Calendar, BookOpen } from 'lucide-react';
import { toast } from '../../components/toastBus';

interface LeaseContract {
  id: number;
  durationMonths: number;
  totalFee: number;
  monthlyFee: number;
  contractStart: string | null;
  status: string;
  businessName: string;
  businessCategory: string;
  paymentMethod: string | null;
  location: { id: number; name: string; pricePerYear: number | null; floor?: { floorname: string } | null };
}

interface Bill {
  paymentid: number;
  period: string;
  amount: number;
  status: string;
  method: string | null;
  paidAt: string | null;
  notes: string | null;
  orderId: string | null;
  payUrl: string | null;
  tenant: { tenantid: number; name: string; category: string };
  location: { id: number; name: string; floor: { floorname: string } | null } | null;
}

const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const periodLabel = (period: string) =>
  new Date(`${period}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Unpaid: { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  Overdue: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  Partial: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Paid: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
};

export default function CostsPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [contracts, setContracts] = useState<LeaseContract[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);

  const fetchBills = async () => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      if (!user?.userid) { setBills([]); setContracts([]); return; }
      const [resBills, resReqs] = await Promise.all([
        axios.get<Bill[]>(`${BACKEND_URL}/tenant-payments`, { params: { userid: user.userid } }),
        axios.get<LeaseContract[]>(`${BACKEND_URL}/tenant-requests`, { params: { userid: user.userid } }),
      ]);
      setBills(resBills.data);
      setContracts(resReqs.data.filter((r) => ['Approved', 'Paid', 'Active'].includes(r.status)));
    } catch { toast('Failed to load your invoices'); }
    finally { setLoadingBills(false); }
  };

  const checkStatus = async (id: number) => {
    setCheckingId(id);
    try { await axios.get(`${BACKEND_URL}/tenant-payments/${id}/status`); await fetchBills(); }
    catch { /* Midtrans may be unreachable in sandbox */ }
    finally { setCheckingId(null); }
  };

  // after returning from the Midtrans sandbox page, reflect the latest status
  useEffect(() => {
    (async () => {
      await fetchBills();
    })();
  }, []);

  const contractEnd = (contract: LeaseContract) => {
    if (!contract.contractStart) return null;
    const d = new Date(contract.contractStart);
    d.setMonth(d.getMonth() + contract.durationMonths);
    return d;
  };

  const CONTRACT_STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
    Active: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    Paid: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    Approved: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  };

  const fallbackMarkPaid = async (bill: Bill) => {
    if (!confirm(`Mark ${periodLabel(bill.period)} invoice for ${bill.location?.name ?? bill.tenant.name} as paid?`)) return;
    setPayingId(bill.paymentid);
    try {
      await axios.patch(`${BACKEND_URL}/tenant-payments/${bill.paymentid}`, { status: 'Paid' });
      toast(`Invoice ${periodLabel(bill.period)} marked as paid`);
      await fetchBills();
    } catch { toast('Failed to mark invoice as paid'); }
    finally { setPayingId(null); }
  };

  const handlePay = async (bill: Bill) => {
    setPayingId(bill.paymentid);
    try {
      const res = await axios.post<{ configured: boolean; payment_url?: string }>(
        `${BACKEND_URL}/tenant-payments/${bill.paymentid}/begin-payment`,
        { returnUrl: `${window.location.origin}/tenant/costs` },
      );
      if (res.data.configured && res.data.payment_url) {
        window.location.href = res.data.payment_url;
        return;
      }
      await fallbackMarkPaid(bill);
    } catch (e) {
      const msg = axios.isAxiosError(e) && e.response?.data?.message ? String(e.response.data.message) : 'Failed to start payment';
      toast(msg);
    } finally { setPayingId(null); }
  };

  const unpaidFirst = [...bills].sort((a, b) => {
    const rank = (s: string) => (s === 'Paid' ? 1 : 0);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return a.period < b.period ? 1 : -1;
  });
  const outstanding = bills.filter(b => b.status !== 'Paid').reduce((s, b) => s + b.amount, 0);
  const hasApproved = bills.length > 0;
  const pendingBills = bills.filter(b => b.status !== 'Paid');

  return (
    <div className="tenant-page">
      <h1 className="tenant-title"><Wallet size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Costs &amp; Contract</h1>
      <p className="tenant-sub">View your approved lease contracts and monthly invoices.</p>

      {/* ====================== YOUR CONTRACTS ====================== */}
      {contracts.length > 0 && (
        <section style={{ marginTop: 18, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <BookOpen size={16} style={{ color: 'var(--accent-color)' }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Approved Lease Contract</h2>
            <span className="status-badge outline" style={{ marginLeft: 'auto' }}>
              {contracts.length} active contract{contracts.length > 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
            {contracts.map(c => {
              const st = CONTRACT_STATUS_STYLE[c.status] ?? CONTRACT_STATUS_STYLE.Approved;
              const endDate = contractEnd(c);
              return (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, border: '1px solid var(--border-color)', borderRadius: 12, background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 15 }}><Building2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {c.location.name}</b>
                        <span className="status-badge outline">{c.location.floor?.floorname ?? '-'}</span>
                        <span className="status-badge solid" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{c.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {c.businessName} · {c.businessCategory || 'General'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Monthly Rent</div>
                      <div style={{ fontWeight: 800, fontSize: 15, fontFamily: 'var(--mono)' }}>{formatRupiah(c.monthlyFee)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 10, padding: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', display: 'flex', gap: 4, alignItems: 'center' }}><Calendar size={11} /> Duration</div>
                      <b style={{ fontSize: 13 }}>{c.durationMonths} months</b>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', display: 'flex', gap: 4, alignItems: 'center' }}><Calendar size={11} /> Period</div>
                      <b style={{ fontSize: 13 }}>{fmtDate(c.contractStart)} – {fmtDate(endDate ? endDate.toISOString() : null)}</b>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', display: 'flex', gap: 4, alignItems: 'center' }}><Wallet size={11} /> Total Contract</div>
                      <b style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>{formatRupiah(c.totalFee)}</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ====================== YOUR INVOICES ====================== */}
      <section style={{ marginTop: 18, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Receipt size={16} style={{ color: 'var(--accent-color)' }} />
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Your Invoices</h2>
          <span className="status-badge outline" style={{ marginLeft: 'auto' }}>
            {loadingBills ? 'Loading…' : hasApproved ? `${bills.length} bill${bills.length > 1 ? 's' : ''}` : 'No approved lease'}
          </span>
        </div>

        {loadingBills ? (
          <p style={{ fontSize: 12, opacity: 0.6, marginTop: 14 }}>Loading your invoices…</p>
        ) : !hasApproved ? (
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, border: '1px dashed var(--border-color)', borderRadius: 10, background: '#f8fafc' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#0ea5e9' }} />
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              You don’t have any invoices yet. Once an admin <b>approves</b> your lease request, your monthly
              invoice will be generated and start appearing here.
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => navigate('/tenant')} style={{ padding: '8px 14px', fontSize: 12, borderRadius: 999 }}>
                  <CreditCard size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Browse vacant units
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <div style={{ flex: '1 1 200px', padding: 12, background: pendingBills.length ? '#fffbeb' : '#f0fdf4', border: `1px solid ${pendingBills.length ? '#fde68a' : '#bbf7d0'}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>Outstanding total</div>
                <b style={{ fontSize: 17 }}>{outstanding ? formatRupiah(outstanding) : 'Rp 0'}</b>
              </div>
              <div style={{ flex: '1 1 200px', padding: 12, background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>Pending invoices</div>
                <b style={{ fontSize: 17 }}>{pendingBills.length}</b>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {unpaidFirst.map(b => {
                const st = STATUS_STYLE[b.status] ?? STATUS_STYLE.Unpaid;
                const isPaid = b.status === 'Paid';
                return (
                  <div key={b.paymentid} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: 14, border: isPaid ? '1px solid var(--border-color)' : '1px solid var(--accent-color)', borderRadius: 12, background: isPaid ? '#f8fafc' : '#ffffff' }}>
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 14 }}>{periodLabel(b.period)}</b>
                        <span className="status-badge solid" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{b.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {b.location?.name ?? b.tenant.name} · {b.location?.floor?.floorname ?? '-'} · {b.tenant.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, fontFamily: 'var(--mono)' }}>{formatRupiah(b.amount)}</div>
                      {isPaid ? (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Paid on {fmtDate(b.paidAt)}{b.method ? ` · ${b.method}` : ''} <CheckCircle2 size={11} style={{ verticalAlign: 'middle', color: '#16a34a' }} />
                        </div>
                      ) : b.orderId ? (
                        <button type="button" onClick={() => checkStatus(b.paymentid)} disabled={checkingId === b.paymentid}
                          style={{ border: 0, background: 'transparent', color: 'var(--accent-color)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '2px 0' }}>
                          <RefreshCw size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />{checkingId === b.paymentid ? 'Checking…' : 'Payment started · check status'}
                        </button>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Not paid yet</div>
                      )}
                    </div>
                    {!isPaid && (
                      <button type="button" className="btn-secondary" onClick={() => handlePay(b)} disabled={payingId === b.paymentid}
                        style={{ padding: '9px 16px', fontSize: 12, borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <CreditCard size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        {payingId === b.paymentid ? 'Redirecting…' : 'Pay Now'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.6 }}>
              Payments are processed via <b>Midtrans (sandbox)</b> — you’ll be redirected to the payment provider and
              the invoice is updated automatically when payment settles. Until the Midtrans server key is set,
              the invoice can be marked as paid manually by the admin.
            </p>
          </>
        )}
      </section>
    </div>
  );
}