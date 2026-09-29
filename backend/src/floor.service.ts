import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ActivityService, type ActionMeta } from './activity.service';

@Injectable()
export class FloorService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  async findAll() {
    const floors = await this.prisma.floor.findMany({
      where: { isDeleted: false },
      orderBy: [{ sortOrder: 'asc' }, { floorid: 'asc' }],
      include: { _count: { select: { locations: true } } },
    });

    // A floor has no direct tenant relation — tenants hang off locations:
    //   floor -> locations.floorid -> tenants.locationid
    // so the per-floor tenant count has to be aggregated through that join.
    const locations = await this.prisma.location.findMany({
      where: { floorid: { not: null }, isDeleted: false },
      select: { floorid: true, _count: { select: { tenants: true } } },
    });

    const byFloor = new Map<number, number>();
    for (const loc of locations) {
      if (loc.floorid === null) continue;
      byFloor.set(loc.floorid, (byFloor.get(loc.floorid) ?? 0) + loc._count.tenants);
    }

    return floors.map((floor) => ({
      ...floor,
      tenantCount: byFloor.get(floor.floorid) ?? 0,
    }));
  }

  async create(data: { floorname: string; floorcode?: string }) {
    const max = await this.prisma.floor.aggregate({ _max: { sortOrder: true } });
    return this.prisma.floor.create({
      data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
  }

  async reorder(orderedIds: number[], meta?: ActionMeta) {
    await this.prisma.$transaction(
      orderedIds.map((id, i) =>
        this.prisma.floor.update({
          where: { floorid: id },
          data: { sortOrder: i },
        }),
      ),
    );
    await this.activity.log(
      `REORDER floors [${orderedIds.join(',')}]`,
      meta,
    );
    return this.findAll();
  }

  async update(id: number, data: { floorname?: string; floorcode?: string }) {
    return this.prisma.floor.update({ where: { floorid: id }, data });
  }

  async remove(id: number, meta?: ActionMeta) {
    const floor = await this.prisma.floor.findFirst({
      where: { floorid: id, isDeleted: false },
      include: { _count: { select: { locations: true } } },
    });
    if (!floor) throw new NotFoundException('Floor not found');
    if (floor._count.locations > 0) {
      throw new NotFoundException(
        `Cannot delete: ${floor._count.locations} locations still exist on this floor`,
      );
    }
    await this.prisma.floor.update({ where: { floorid: id }, data: { isDeleted: true } });
    await this.activity.recordDelete('floor', id, floor.floorname, meta);
    return { removed: floor.floorname };
  }
}
