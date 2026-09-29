import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, Car, FileSpreadsheet, FileText, Loader2, Printer, RefreshCw, Store, Wallet } from 'lucide-react';
import { toast } from '../../../components/toastBus';
import { BACKEND_URL } from '../../../config';
import {
  exportReportExcel,
  exportReportPdf,
  printReport,
  type ExportPayload,
} from '../../../utils/reportExport';

export type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ReportRow {
  period: string;
  parking: number;
  parkingCount: number;
  tenant: number;
  tenantCount: number;
  total: number;
}

interface ReportSummary {
  granularity: Granularity;
  from: string;
  to: string;
  rows: ReportRow[];
  totals: {
    parking: number;
    parkingCount: number;
    tenant: number;
    tenantCount: number;
    total: number;
  };
  basis: { parking: string; tenant: string };
}

const TITLES: Record<Granularity, { title: string; subtitle: string }> = {
  daily: {
    title: 'Daily Report',
    subtitle: 'Revenue per day — parking tickets and tenant mall fees.',
  },
  weekly: {
    title: 'Weekly Report',
    subtitle: 'Revenue aggregated per week (Monday as the first day).',
  },
  monthly: {
    title: 'Monthly Report',
    subtitle: 'Revenue aggregated per month, including prorated tenant fees.',
  },
  yearly: {
    title: 'Yearly Report',
    subtitle: 'Revenue aggregated per year across the selected range.',
  },
};

/**
 * Quick ranges, per report. A yearly report groups its rows by year, so a short
 * range like "Today" or "Last 7 Days" would silently collapse into a single
 * partial-year row — hence the empty list. The monthly report only offers
 * month-aligned presets for the same reason.
 */
const PRESETS: Record<Granularity, { key: string; label: string }[]> = {
  daily: [
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ],
  weekly: [
    { key: 'week', label: 'This Week' },
    { key: 'lastweek', label: 'Last Week' },
  ],
  monthly: [
    { key: 'month', label: 'This Month' },
    { key: 'lastmonth', label: 'Last Month' },
    { key: 'year', label: 'This Year' },
  ],
  yearly: [],
};

const toInputDate = (d: Date) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 10);
};

const formatIDR = (value: number) =>
  'Rp ' + Math.round(value).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const defaultRange = (granularity: Granularity) => {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  if (granularity === 'daily') from.setDate(from.getDate() - 13);
  else if (granularity === 'weekly') from.setDate(from.getDate() - 83);
  else if (granularity === 'monthly') from.setMonth(from.getMonth() - 11);
  else from.setFullYear(from.getFullYear() - 3);
  return { from: toInputDate(from), to: toInputDate(to) };
};

export default function ReportView({ granularity = 'daily' }: { granularity?: Granularity }) {
  const [range, setRange] = useState(() => defaultRange(granularity));
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<ReportSummary>(`${BACKEND_URL}/reports/summary`, {
        params: { granularity, from: range.from, to: range.to },
      });
      setData(res.data);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load report data.';
      toast(message);
    } finally {
      setLoading(false);
    }
  }, [granularity, range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = (preset: string) => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);
    if (preset === 'today') {
      /* keep same day */
    } else if (preset === '7d') from.setDate(from.getDate() - 6);
    else if (preset === '30d') from.setDate(from.getDate() - 29);
    else if (preset === 'month') from.setDate(1);
    else if (preset === 'lastmonth') {
      // Day 0 *of the current month* is that month's last day, which is the end
      // of the previous month — so the month is left alone and only the day is
      // zeroed. Shifting the month by -1 as well would land on the month before
      // that, and letting the day overflow (Jan 31 - 1 month) would spill into
      // March. from is simply the 1st of the previous month.
      to.setMonth(to.getMonth(), 0);
      from.setMonth(from.getMonth() - 1, 1);
    } else if (preset === 'week' || preset === 'lastweek') {
      // Monday-based, matching the backend's week bucket key
      // (`(getDay() + 6) % 7`), so a preset never straddles two bucket rows.
      // "This Week" runs Monday..today (mirroring "This Month" as the 1st..today)
      // while "Last Week" is the full previous Monday..Sunday.
      const monday = new Date(from);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      if (preset === 'lastweek') {
        monday.setDate(monday.getDate() - 7);
        to.setTime(monday.getTime());
        to.setDate(to.getDate() + 6);
      }
      from.setTime(monday.getTime());
    } else if (preset === 'year') {
      from.setMonth(0, 1);
    }
    setRange({ from: toInputDate(from), to: toInputDate(to) });
  };

  const meta = TITLES[granularity];
  const totals = data?.totals;
  const period = `${range.from} s/d ${range.to}`;

  const exportPayload = (): ExportPayload => ({
    title: meta.title,
    subtitle: meta.subtitle,
    period,
    columns: [
      { header: 'Period', align: 'left' },
      { header: 'Revenue', align: 'right' },
    ],
    rows: (data?.rows ?? []).map((r) => ({ cells: [r.period, formatIDR(r.total)] })),
    fileBase: `report-${granularity}-${range.from}_${range.to}`,
  });

  const hasRows = Boolean(data && data.rows.length > 0);
  const guard = () => {
    if (!hasRows) {
      toast('No data to export.');
      return false;
    }
    return true;
  };
  const handlePrint = async () => {
    if (!guard()) return;
    if (!(await printReport(exportPayload()))) {
      toast('Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.');
    }
  };
  const handlePdf = async () => {
    if (!guard()) return;
    await exportReportPdf(exportPayload());
  };
  const handleExcel = async () => {
    if (!guard()) return;
    await exportReportExcel(exportPayload());
  };

  const cards = [
    { label: 'Total Revenue', value: totals ? formatIDR(totals.total) : '—', icon: Wallet },
    { label: 'Parking Revenue', value: totals ? formatIDR(totals.parking) : '—', icon: Car },
    { label: 'Tenant Mall Fee', value: totals ? formatIDR(totals.tenant) : '—', icon: Store },
    {
      label: 'Transactions',
      value: totals ? `${totals.parkingCount + totals.tenantCount}` : '—',
      icon: BarChart3,
    },
  ];

  return (
    <div className="simulator-panel" style={{ marginTop: 0 }}>
      <div className="data-page-header">
        <div>
          <h2 className="welcome-title">
            <BarChart3 size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> {meta.title}
          </h2>
          <p className="welcome-text">{meta.subtitle}</p>
        </div>
        <div className="data-page-actions">
          <button className="btn-secondary" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 size={15} className="spinner" /> : <RefreshCw size={15} />} Refresh
          </button>
        </div>
      </div>

      <div className="report-filters">
        {PRESETS[granularity].length > 0 && (
          <div className="report-presets">
            {PRESETS[granularity].map((p) => (
              <button key={p.key} className="report-preset-btn" onClick={() => applyPreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div className="report-range">
          <label className="report-range-field">
            <span>From</span>
            <input
              type="date"
              className="form-input"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </label>
          <label className="report-range-field">
            <span>To</span>
            <input
              type="date"
              className="form-input"
              value={range.to}
              min={range.from}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </label>
        </div>
      </div>

      <div className="report-stats">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div className="report-stat-card" key={c.label}>
              <span className="report-stat-icon">
                <Icon size={18} />
              </span>
              <div className="report-stat-body">
                <span className="report-stat-val">{c.value}</span>
                <span className="report-stat-lbl">{c.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="report-print-area">
        <div className="report-print-head">
          <strong>{meta.title}</strong>
          <span>{meta.subtitle}</span>
          <span>Periode: {period}</span>
        </div>
        <div className="data-scroll">
          <div className="table-container">
            <table className="data-table report-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="cell-right col-money">Revenue</th>
                  <th className="col-print">Print</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="empty-row">
                    <td colSpan={3}>Loading report data...</td>
                  </tr>
                ) : !data || data.rows.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={3}>No revenue recorded for this range.</td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.period}>
                      <td>{r.period}</td>
                      <td className="cell-right cell-strong col-money">{formatIDR(r.total)}</td>
                      <td className="col-print">
                        {/* Icon-only, so every button carries a `title` for the
                            hover hint and an `aria-label` for screen readers —
                            the visible text used to be the only label. */}
                        <span className="report-print-btns">
                          <button
                            className="report-print-btn"
                            onClick={handlePrint}
                            disabled={loading || !hasRows}
                            title="Buka laporan di tab baru lalu cetak"
                            aria-label="Print"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            className="report-print-btn report-print-btn--pdf"
                            onClick={handlePdf}
                            disabled={loading || !hasRows}
                            title="Download as PDF"
                            aria-label="Download as PDF"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            className="report-print-btn report-print-btn--excel"
                            onClick={handleExcel}
                            disabled={loading || !hasRows}
                            title="Download as Excel"
                            aria-label="Download as Excel"
                          >
                            <FileSpreadsheet size={15} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data && (
        <p className="report-basis">
          {data.basis.parking} {data.basis.tenant}
        </p>
      )}
    </div>
  );
}
