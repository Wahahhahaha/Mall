import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from './prisma.service';
import { SettingsService } from './settings.service';

/** Monthly rent is derived from the unit's annual price: locations.pricePerYear / 12. */
export function monthlyFee(pricePerYear: number | null | undefined): number {
  return Math.round((pricePerYear ?? 0) / 12);
}

export function contractTotal(monthly: number, durationMonths: number): number {
  return Math.max(0, Math.round(monthly * durationMonths));
}

const LOCATION_INCLUDE = { floor: true, tenants: true } as const;

@Injectable()
export class TenantRequestService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private mailerService: MailerService,
  ) {}

  async findAll(userid?: number) {
    const where = { isDeleted: false, ...(userid ? { userid } : {}) };
    const rows = await this.prisma.tenantRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        location: { include: LOCATION_INCLUDE },
        user: { select: { userid: true, email: true, levelid: true } },
      },
    });
    return rows.map((row) => ({ ...row, monthlyFee: this.monthlyFor(row.location) }));
  }

  async findOne(id: number) {
    const req = await this.prisma.tenantRequest.findUnique({
      where: { id },
      include: {
        location: { include: LOCATION_INCLUDE },
        user: { select: { userid: true, email: true, levelid: true } },
      },
    });
    if (!req) throw new NotFoundException('Request not found');
    return { ...req, monthlyFee: this.monthlyFor(req.location) };
  }

  /** Vacant units: no tenant holding an active lease on that location. */
  async availableLocations() {
    const now = new Date();
    // collected separately because an OR inside a `none` relation filter is not
    // applied by Prisma
    const activeTenants = await this.prisma.tenant.findMany({
      where: { isDeleted: false, OR: [{ leaseUntil: null }, { leaseUntil: { gte: now } }] },
      select: { locationid: true },
    });
    // A unit is only "vacant" when no one holds it yet: neither an active
    // tenant on it nor a live (non-rejected) tenant_request for it.
    const liveRequests = await this.prisma.tenantRequest.findMany({
      where: {
        isDeleted: false,
        status: { in: ['Pending', 'Approved', 'Paid', 'Active'] },
      },
      select: { locationid: true },
    });
    const occupied = [
      ...activeTenants.map((t) => t.locationid),
      ...liveRequests.map((r) => r.locationid),
    ].filter((v): v is number => v !== null);

    const locations = await this.prisma.location.findMany({
      where: { isDeleted: false, id: { notIn: occupied } },
      orderBy: { name: 'asc' },
      include: { floor: true },
    });
    return locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      floor: loc.floor,
      x: loc.x,
      y: loc.y,
      pricePerYear: loc.pricePerYear,
      minLeaseYears: loc.minLeaseYears,
      monthlyFee: this.monthlyFor(loc),
    }));
  }

  async create(data: {
    userid: number;
    locationid: number;
    durationMonths: number;
    paymentMethod?: string;
    businessName: string;
    businessCategory: string;
    description?: string;
    phone?: string;
    contractStart?: string;
  }) {
    const location = await this.prisma.location.findFirst({
      where: { id: data.locationid, isDeleted: false },
      include: { floor: true, tenants: { where: { isDeleted: false } } },
    });
    if (!location) throw new NotFoundException('Unit not found');

    const now = new Date();
    // Occupied by an active tenant OR by another pending/live request on the
    // same unit (joined check across tenants + tenant_requests).
    const takenByTenant = location.tenants.some(
      (t) => !t.leaseUntil || t.leaseUntil > now,
    );
    const takenByRequest = await this.prisma.tenantRequest.findFirst({
      where: {
        locationid: location.id,
        isDeleted: false,
        status: { in: ['Pending', 'Approved', 'Paid', 'Active'] },
      },
      select: { id: true },
    });
    if (takenByTenant || takenByRequest) {
      throw new BadRequestException('Unit is already taken / not vacant');
    }
    if (!data.durationMonths || data.durationMonths < 12) {
      throw new BadRequestException('Minimum contract duration is 12 months (1 year)');
    }
    if (data.durationMonths > 120) {
      throw new BadRequestException('Maximum contract duration is 120 months');
    }

    const monthly = this.monthlyFor(location);
    const created = await this.prisma.tenantRequest.create({
      data: {
        userid: data.userid,
        locationid: data.locationid,
        durationMonths: data.durationMonths,
        totalFee: contractTotal(monthly, data.durationMonths),
        paymentMethod: data.paymentMethod,
        businessName: data.businessName,
        businessCategory: data.businessCategory,
        description: data.description ?? null,
        phone: data.phone ?? null,
        contractStart: data.contractStart ? new Date(data.contractStart) : null,
        status: 'Pending',
      },
      include: {
        location: { include: LOCATION_INCLUDE },
        user: { select: { userid: true, email: true, levelid: true } },
      },
    });
    return { ...created, monthlyFee: monthly };
  }

  async updateStatus(id: number, status: string) {
    const req = await this.prisma.tenantRequest.findUnique({
      where: { id },
      include: {
        location: true,
        user: { select: { userid: true, email: true } },
      },
    });
    if (!req) throw new NotFoundException('Request not found');
    const allowed = ['Pending', 'Approved', 'Rejected', 'Paid', 'Active'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid status');

    // if Approved -> occupy the unit, raise the first invoice, notify the applicant
    if (status === 'Approved') {
      const start = req.contractStart ?? new Date();
      const leaseUntil = new Date(start);
      leaseUntil.setMonth(leaseUntil.getMonth() + req.durationMonths);

      const tenant = await this.prisma.tenant.findFirst({
        where: { locationid: req.locationid, isDeleted: false },
      });
      let tenantid: number;
      if (tenant) {
        await this.prisma.tenant.update({
          where: { tenantid: tenant.tenantid },
          data: { leaseUntil },
        });
        tenantid = tenant.tenantid;
      } else {
        const createdTenant = await this.prisma.tenant.create({
          data: {
            name: req.businessName,
            category: req.businessCategory,
            locationid: req.locationid,
            leaseUntil,
          },
        });
        tenantid = createdTenant.tenantid;
      }

      // first invoice for the contract start month — paid later via Midtrans
      const period = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      const amount = monthlyFee(req.location?.pricePerYear);
      await this.prisma.tenantPayment.upsert({
        where: { tenantid_period: { tenantid, period } },
        create: { tenantid, locationid: req.locationid, period, amount, status: 'Unpaid' },
        update: {},
      });

      await this.sendApprovalEmail(req.user?.email, {
        unit: req.location?.name ?? String(req.locationid),
        durationMonths: req.durationMonths,
        period,
        amount,
        contractStart: start,
      });
    }

    const updated = await this.prisma.tenantRequest.update({
      where: { id },
      data: { status },
      include: {
        location: { include: LOCATION_INCLUDE },
        user: { select: { userid: true, email: true, levelid: true } },
      },
    });
    return { ...updated, monthlyFee: this.monthlyFor(updated.location) };
  }

  /** Soft delete: the row stays with is_deleted = true so it can be restored. */
  async remove(id: number) {
    const req = await this.prisma.tenantRequest.findFirst({ where: { id, isDeleted: false } });
    if (!req) throw new NotFoundException('Request not found');
    await this.prisma.tenantRequest.update({ where: { id }, data: { isDeleted: true } });
    return { removed: req.businessName };
  }

  private async sendApprovalEmail(
    email: string | null | undefined,
    info: {
      unit: string;
      durationMonths: number;
      period: string;
      amount: number;
      contractStart: Date;
    },
  ): Promise<void> {
    if (!email) return;
    const portal = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const [{ systemName }, from] = await Promise.all([
        this.settings.getAll(),
        this.settings.mailFrom(),
      ]);
      await this.mailerService.sendMail({
        from,
        to: email,
        subject: `Your lease request for ${info.unit} has been approved`,
        text:
          `Good news — your lease request has been approved.\n\n` +
          `Unit: ${info.unit}\n` +
          `Contract: ${info.durationMonths} months starting ${info.contractStart.toISOString().slice(0, 10)}\n` +
          `First invoice: ${info.period} — Rp ${info.amount.toLocaleString('id-ID')}\n\n` +
          `Open "Costs & Contract" in your tenant portal to review and pay it:\n${portal}/tenant/costs\n\n` +
          `Payment is processed securely through Midtrans.\n` +
          `${systemName} Tenant Portal`,
      });
    } catch (e) {
      console.error('[lease approval] failed to send email:', e);
    }
  }

  private monthlyFor(location: { pricePerYear: number | null }): number {
    return monthlyFee(location.pricePerYear);
  }
}
