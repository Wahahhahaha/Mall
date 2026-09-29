import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MidtransService } from './midtrans.service';
import { monthlyFee } from './tenant-request.service';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const STATUSES = ['Unpaid', 'Partial', 'Paid', 'Overdue'] as const;

@Injectable()
export class TenantPaymentService {
  constructor(
    private prisma: PrismaService,
    private midtrans: MidtransService,
  ) {}

  async findAll(params?: {
    tenantid?: number;
    period?: string;
    status?: string;
    userid?: number;
  }) {
    let tenantids: number[] | undefined;
    if (params?.userid) tenantids = await this.tenantidsForUser(params.userid);

    return this.prisma.tenantPayment.findMany({
      where: {
        ...(tenantids ? { tenantid: { in: tenantids } } : {}),
        ...(params?.tenantid ? { tenantid: params.tenantid } : {}),
        ...(params?.period ? { period: params.period } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
      orderBy: [{ period: 'desc' }, { tenantid: 'asc' }],
      include: {
        tenant: { select: { tenantid: true, name: true, category: true } },
        location: { select: { id: true, name: true, floor: { select: { floorname: true } } } },
      },
    });
  }

  /**
   * Tenant requests are location-based, so a user's leases are resolved through the
   * units they hold an approved request on.
   */
  private async tenantidsForUser(userid: number): Promise<number[]> {
    const requests = await this.prisma.tenantRequest.findMany({
      where: {
        userid,
        isDeleted: false,
        status: { in: ['Approved', 'Active', 'Paid'] },
      },
      select: { locationid: true },
    });
    const locationids = [...new Set(requests.map((r) => r.locationid))];
    if (locationids.length === 0) return [];
    const tenants = await this.prisma.tenant.findMany({
      where: { isDeleted: false, locationid: { in: locationids } },
      select: { tenantid: true },
    });
    return tenants.map((t) => t.tenantid);
  }

  async findOne(id: number) {
    const payment = await this.prisma.tenantPayment.findUnique({
      where: { paymentid: id },
      include: { tenant: true, location: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async create(data: {
    tenantid: number;
    period: string;
    amount?: number;
    status?: string;
    method?: string | null;
    paidAt?: string | null;
    notes?: string | null;
  }) {
    this.assertPeriod(data.period);
    this.assertStatus(data.status);

    const tenant = await this.prisma.tenant.findFirst({
      where: { tenantid: data.tenantid, isDeleted: false },
      include: { location: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const existing = await this.prisma.tenantPayment.findUnique({
      where: { tenantid_period: { tenantid: tenant.tenantid, period: data.period } },
    });
    if (existing) {
      throw new ConflictException(
        `Payment for ${tenant.name} on ${data.period} already exists`,
      );
    }

    return this.prisma.tenantPayment.create({
      data: {
        tenantid: tenant.tenantid,
        locationid: tenant.locationid,
        period: data.period,
        amount: data.amount ?? monthlyFee(tenant.location?.pricePerYear),
        status: data.status ?? 'Unpaid',
        method: data.method ?? null,
        paidAt: data.paidAt ? new Date(data.paidAt) : null,
        notes: data.notes ?? null,
      },
      include: { tenant: true, location: true },
    });
  }

  async update(
    id: number,
    data: {
      amount?: number;
      status?: string;
      method?: string | null;
      paidAt?: string | null;
      notes?: string | null;
    },
  ) {
    await this.findOne(id);
    this.assertStatus(data.status);

    const payload: Record<string, unknown> = {};
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.status !== undefined) {
      payload.status = data.status;
      if (data.status === 'Paid' && data.paidAt === undefined) {
        payload.paidAt = new Date();
      }
    }
    if (data.method !== undefined) payload.method = data.method;
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.paidAt !== undefined) {
      payload.paidAt = data.paidAt ? new Date(data.paidAt) : null;
    }

    return this.prisma.tenantPayment.update({
      where: { paymentid: id },
      data: payload,
      include: { tenant: true, location: true },
    });
  }

  async remove(id: number) {
    const payment = await this.findOne(id);
    await this.prisma.tenantPayment.delete({ where: { paymentid: id } });
    return { removed: payment.period };
  }

  /**
   * Start a Midtrans payment for an unpaid invoice. Without a configured
   * Midtrans server key this resolves to { configured: false } so the front
   * end can fall back to the local mark-as-paid flow.
   */
  async beginPayment(id: number, returnUrl?: string) {
    const payment = await this.findOne(id);
    if (!this.midtrans.isConfigured()) {
      return { configured: false, paymentid: id };
    }
    try {
      const orderId = `MALL-${payment.paymentid}-${Date.now()}`
        .replace(/[^A-Za-z0-9-]/g, '')
        .slice(0, 50);

      const snap = await this.midtrans.createSnap({
        orderId,
        grossAmount: payment.amount,
        customer: {
          name: payment.tenant?.name ?? undefined,
          email: undefined,
        },
        returnUrl: returnUrl || undefined,
      });

      const updated = await this.prisma.tenantPayment.update({
        where: { paymentid: id },
        data: { orderId, payUrl: snap.redirect_url },
        include: { tenant: true, location: true },
      });
      return { configured: true, token: snap.token, payment_url: snap.redirect_url, payment: updated };
    } catch {
      return { configured: false, paymentid: id };
    }
    if (payment.status === 'Paid') {
      throw new BadRequestException('This invoice is already paid');
    }

    const orderId = `MALL-${payment.paymentid}-${Date.now()}`
      .replace(/[^A-Za-z0-9-]/g, '')
      .slice(0, 50);

    const snap = await this.midtrans.createSnap({
      orderId,
      grossAmount: payment.amount,
      customer: {
        name: payment.tenant?.name ?? undefined,
        email: undefined,
      },
      returnUrl: returnUrl || undefined,
    });

    const updated = await this.prisma.tenantPayment.update({
      where: { paymentid: id },
      data: { orderId, payUrl: snap.redirect_url },
      include: { tenant: true, location: true },
    });
    return { configured: true, token: snap.token, payment_url: snap.redirect_url, payment: updated };
  }

  /** Query Midtrans for the current status and sync the local record. */
  async refreshMidtransStatus(id: number) {
    const payment = await this.findOne(id);
    if (!payment.orderId) {
      return { ...payment, midtransChecked: true };
    }
    const st = await this.midtrans.getStatus(payment.orderId);
    if (st.paymentStatus === 'Paid' && payment.status !== 'Paid') {
      return this.prisma.tenantPayment.update({
        where: { paymentid: id },
        data: { status: 'Paid', paidAt: new Date(), method: st.paymentType },
        include: { tenant: true, location: true },
      });
    }
    return { ...payment, midtransStatus: st.midtransStatus };
  }

  /**
   * Creates one Unpaid row per active tenant for the given month.
   * Tenants that already have a row for that period are skipped.
   */
  async generate(period: string) {
    this.assertPeriod(period);

    const tenants = await this.prisma.tenant.findMany({
      where: { isDeleted: false, locationid: { not: null } },
      include: { location: true },
    });
    const existing = await this.prisma.tenantPayment.findMany({
      where: { period },
      select: { tenantid: true },
    });
    const taken = new Set(existing.map((p) => p.tenantid));

    const pending = tenants.filter((t) => !taken.has(t.tenantid));
    if (pending.length > 0) {
      await this.prisma.tenantPayment.createMany({
        data: pending.map((t) => ({
          tenantid: t.tenantid,
          locationid: t.locationid,
          period,
          amount: monthlyFee(t.location?.pricePerYear),
          status: 'Unpaid',
        })),
      });
    }
    return { period, created: pending.length, skipped: taken.size };
  }

  private assertPeriod(period: string) {
    if (!PERIOD_RE.test(period ?? '')) {
      throw new BadRequestException('Period must be in YYYY-MM format');
    }
  }

  private assertStatus(status?: string) {
    if (status !== undefined && !STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new BadRequestException(`Invalid status. Use one of: ${STATUSES.join(', ')}`);
    }
  }
}
