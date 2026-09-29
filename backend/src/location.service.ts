import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ActivityService, type ActionMeta } from './activity.service';

@Injectable()
export class LocationService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  findAll(params?: { floorid?: number; search?: string }) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (params?.floorid) where.floorid = params.floorid;
    if (params?.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    return this.prisma.location.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { floor: true, tenants: { select: { tenantid: true, name: true } } },
    });
  }

  findOne(id: number) {
    return this.prisma.location.findUnique({
      where: { id },
      include: { floor: true, tenants: { select: { tenantid: true, name: true } } },
    });
  }

  create(data: { name: string; floorid?: number | null; x: number; y: number; pricePerYear?: number | null; minLeaseYears?: number }) {
    return this.prisma.location.create({
      data: {
        name: data.name,
        floorid: data.floorid ?? null,
        x: data.x,
        y: data.y,
        pricePerYear: data.pricePerYear ?? 50000000,
        minLeaseYears: data.minLeaseYears ?? 1,
      },
      include: { floor: true },
    });
  }

  async update(
    id: number,
    data: { name?: string; floorid?: number | null; x?: number; y?: number; pricePerYear?: number | null; minLeaseYears?: number },
  ) {
    const exists = await this.prisma.location.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Location not found');
    return this.prisma.location.update({
      where: { id },
      data: {
        name: data.name,
        floorid: data.floorid,
        x: data.x,
        y: data.y,
        pricePerYear: data.pricePerYear,
        minLeaseYears: data.minLeaseYears,
      },
      include: { floor: true },
    });
  }

  async remove(id: number, meta?: ActionMeta) {
    const loc = await this.prisma.location.findFirst({ where: { id, isDeleted: false } });
    if (!loc) throw new NotFoundException('Location not found');
    await this.prisma.location.update({ where: { id }, data: { isDeleted: true } });
    await this.activity.recordDelete('location', id, loc.name, meta);
    return { removed: loc.name };
  }
}
