import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface ActionMeta {
  ip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  userid?: number | null;
  email?: string | null;
}

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, meta?: ActionMeta) {
    return this.prisma.activityLog.create({
      data: {
        action,
        ip: meta?.ip || null,
        latitude: meta?.latitude ?? null,
        longitude: meta?.longitude ?? null,
        userid: meta?.userid ?? null,
        email: meta?.email || null,
      },
    });
  }

  /** Rows are soft-deleted (is_deleted = true); this only records the audit trail. */
  async recordDelete(entityType: string, id: number, name: string, meta?: ActionMeta) {
    return this.log(`DELETE ${entityType} #${id} (${name})`, meta);
  }

  async listLogs(params?: { search?: string; from?: string; to?: string; role?: string }) {
    const where: Record<string, unknown> = {};
    if (params?.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { ip: { contains: params.search, mode: 'insensitive' } },
        { user: { email: { contains: params.search, mode: 'insensitive' } } },
        { user: { level: { levelname: { contains: params.search, mode: 'insensitive' } } } },
      ];
    }
    // role is not stored anymore: it comes from users.levelid -> level.levelname
    if (params?.role) {
      where.user = {
        level: { levelname: { equals: params.role, mode: 'insensitive' } },
      };
    }
    if (params?.from || params?.to) {
      where.datetime = {} as Record<string, Date>;
      const dt = where.datetime as Record<string, Date>;
      if (params.from) dt.gte = new Date(params.from);
      if (params.to) dt.lte = new Date(params.to);
    }
    const rows = await this.prisma.activityLog.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 500,
      include: { user: { select: { email: true, level: { select: { levelname: true } } } } },
    });

    return rows.map(({ user, ...rest }) => ({
      ...rest,
      email: rest.email ?? user?.email ?? null,
      role: user?.level?.levelname ?? null,
    }));
  }
}
