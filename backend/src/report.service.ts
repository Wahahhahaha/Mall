import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type ReportGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ReportQuery {
  from?: string;
  to?: string;
  granularity?: ReportGranularity;
}

export interface ReportRow {
  period: string;
  parking: number;
  parkingCount: number;
  tenant: number;
  tenantCount: number;
  total: number;
}

export interface ReportSummary {
  granularity: ReportGranularity;
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
  basis: {
    parking: string;
    tenant: string;
  };
}

const DAY = 24 * 60 * 60 * 1000;

const addMonths = (d: Date, months: number) => {
  const out = new Date(d);
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  return out;
};

const endOfMonth = (d: Date) => {
  const out = new Date(d);
  out.setMonth(out.getMonth() + 1, 0);
  return endOfDay(out);
};

const startOfDay = (d: Date) => {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
};

const endOfDay = (d: Date) => {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
};

const periodKey = (d: Date, granularity: ReportGranularity) => {
  if (granularity === 'yearly') return String(d.getFullYear());

  if (granularity === 'monthly') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  if (granularity === 'weekly') {
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - day);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(
      monday.getDate(),
    ).padStart(2, '0')}`;
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

const periodLabel = (key: string, granularity: ReportGranularity) => {
  if (granularity === 'yearly') return key;

  if (granularity === 'monthly') {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  if (granularity === 'weekly') {
    const [y, m, d] = key.split('-');
    const start = new Date(Number(y), Number(m) - 1, Number(d));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric', year: 'numeric' },
    )}`;
  }

  const [y, m, d] = key.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async summary(query: ReportQuery): Promise<ReportSummary> {
    const granularity = query.granularity ?? 'daily';
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(granularity)) {
      throw new BadRequestException('Invalid granularity');
    }

    const now = new Date();
    const to = query.to ? endOfDay(new Date(query.to)) : endOfDay(now);
    const from = query.from ? startOfDay(new Date(query.from)) : startOfDay(now);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (from > to) throw new BadRequestException('`from` must be before `to`');

    const spanDays = Math.ceil((to.getTime() - from.getTime()) / DAY) + 1;
    const defaultSpan =
      granularity === 'daily' ? 120 : granularity === 'weekly' ? 730 : granularity === 'monthly' ? 3650 : 3650;
    if (spanDays > defaultSpan) {
      throw new BadRequestException(
        `Range too large for ${granularity} report (max ${defaultSpan} days). Use a smaller range.`,
      );
    }

    const [tickets, tenants] = await Promise.all([
      this.prisma.parkingTicket.findMany({
        where: { exitAt: { gte: from, lte: to } },
        select: { exitAt: true, fee: true },
      }),
      this.prisma.tenant.findMany({
        where: {
          isDeleted: false,
          location: { isDeleted: false },
          OR: [{ leaseUntil: null }, { leaseUntil: { gte: from } }],
        },
        select: {
          tenantid: true,
          leaseUntil: true,
          createdAt: true,
          location: { select: { pricePerYear: true } },
        },
      }),
    ]);

    const buckets = new Map<string, ReportRow>();
    const bucket = (key: string) => {
      let row = buckets.get(key);
      if (!row) {
        row = {
          period: key,
          parking: 0,
          parkingCount: 0,
          tenant: 0,
          tenantCount: 0,
          total: 0,
        };
        buckets.set(key, row);
      }
      return row;
    };

    for (const t of tickets) {
      if (!t.exitAt) continue;
      const row = bucket(periodKey(t.exitAt, granularity));
      row.parking += t.fee ?? 0;
      row.parkingCount += 1;
    }

    for (const tenant of tenants) {
      // monthly rent is derived from the unit's annual price
      const fee = Math.round((tenant.location?.pricePerYear ?? 0) / 12);
      if (!fee) continue;

      const createdAt = tenant.createdAt ?? from;
      const activeFrom = createdAt > from ? createdAt : from;
      const leaseEnd = tenant.leaseUntil ? endOfDay(tenant.leaseUntil) : to;
      const activeTo = leaseEnd < to ? leaseEnd : to;
      if (activeFrom > activeTo) continue;

      const seenPeriods = new Set<string>();
      let cursor = new Date(activeFrom);
      cursor.setHours(0, 0, 0, 0);
      cursor.setDate(1);

      while (cursor <= activeTo) {
        const monthStart = cursor;
        const monthEnd = endOfMonth(monthStart);
        const sliceStart = monthStart < activeFrom ? activeFrom : monthStart;
        const sliceEnd = monthEnd > activeTo ? activeTo : monthEnd;
        if (sliceStart <= sliceEnd) {
          const daysInMonth = Math.round(
            (addMonths(monthStart, 1).getTime() - monthStart.getTime()) / DAY,
          );
          const activeDays =
            Math.round((startOfDay(sliceEnd).getTime() - startOfDay(sliceStart).getTime()) / DAY) + 1;

          if (granularity === 'daily') {
            const perDay = fee / daysInMonth;
            for (let day = new Date(sliceStart); day <= sliceEnd; day = new Date(day.getTime() + DAY)) {
              const key = periodKey(day, 'daily');
              bucket(key).tenant += perDay;
              if (!seenPeriods.has(key)) {
                seenPeriods.add(key);
                bucket(key).tenantCount += 1;
              }
            }
          } else {
            const amount = Math.round((fee * activeDays) / daysInMonth);
            const key = periodKey(
              granularity === 'monthly' || granularity === 'yearly' ? monthStart : sliceStart,
              granularity,
            );
            bucket(key).tenant += amount;
            bucket(key).tenantCount += 1;
          }
        }
        cursor = addMonths(monthStart, 1);
      }
    }

    const rows = [...buckets.values()]
      .sort((a, b) => (a.period < b.period ? -1 : 1))
      .map((r) => ({
        ...r,
        parking: Math.round(r.parking),
        tenant: Math.round(r.tenant),
        total: Math.round(r.parking) + Math.round(r.tenant),
      }));

    const totals = rows.reduce(
      (acc, r) => ({
        parking: acc.parking + r.parking,
        parkingCount: acc.parkingCount + r.parkingCount,
        tenant: acc.tenant + r.tenant,
        tenantCount: acc.tenantCount + r.tenantCount,
        total: acc.total + r.total,
      }),
      { parking: 0, parkingCount: 0, tenant: 0, tenantCount: 0, total: 0 },
    );

    return {
      granularity,
      from: from.toISOString(),
      to: to.toISOString(),
      rows: rows.map((r) => ({ ...r, period: periodLabel(r.period, granularity) })),
      totals,
      basis: {
        parking: 'Parking fee recorded on vehicle exit (parking_tickets.fee).',
        tenant:
          'Monthly mall fee accrued per active month between tenant start and lease end; prorated by active days.',
      },
    };
  }
}
