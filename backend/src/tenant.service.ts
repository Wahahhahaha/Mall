import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ActivityService, type ActionMeta } from './activity.service';

const TENANT_INCLUDE = { location: { include: { floor: true } } } as const;

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  findAll() {
    return this.prisma.tenant.findMany({
      where: { isDeleted: false },
      orderBy: { tenantid: 'asc' },
      include: TENANT_INCLUDE,
    });
  }

  async create(data: {
    name: string;
    category: string;
    leaseUntil?: string | null;
    locationid?: number | null;
    logoUrl?: string | null;
  }) {
    if (data.locationid) {
      const taken = await this.prisma.tenant.findFirst({
        where: { locationid: data.locationid, isDeleted: false },
      });
      if (taken) throw new ConflictException('Location is already occupied by another tenant');
    }
    return this.prisma.tenant.create({
      data: {
        name: data.name,
        category: data.category,
        leaseUntil: data.leaseUntil ? new Date(data.leaseUntil) : null,
        locationid: data.locationid ?? null,
        logoUrl: data.logoUrl ?? null,
      },
      include: TENANT_INCLUDE,
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      category?: string;
      leaseUntil?: string | null;
      locationid?: number | null;
      logoUrl?: string | null;
    },
  ) {
    if (data.locationid) {
      const taken = await this.prisma.tenant.findFirst({
        where: { locationid: data.locationid, isDeleted: false },
      });
      if (taken && taken.tenantid !== id)
        throw new ConflictException('Location is already occupied by another tenant');
    }
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.category !== undefined) payload.category = data.category;
    if (data.logoUrl !== undefined) payload.logoUrl = data.logoUrl;
    if (data.leaseUntil !== undefined)
      payload.leaseUntil = data.leaseUntil ? new Date(data.leaseUntil) : null;
    if (data.locationid !== undefined) payload.locationid = data.locationid ?? null;
    return this.prisma.tenant.update({
      where: { tenantid: id },
      data: payload,
      include: TENANT_INCLUDE,
    });
  }

  async remove(id: number, meta?: ActionMeta) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { tenantid: id, isDeleted: false },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.prisma.tenant.update({ where: { tenantid: id }, data: { isDeleted: true } });
    await this.activity.recordDelete('tenant', id, tenant.name, meta);
    return { removed: tenant.name };
  }
}
