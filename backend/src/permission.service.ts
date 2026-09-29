import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ActivityService, type ActionMeta } from './activity.service';

export interface PermissionEntry {
  page: string;
  action: string;
  granted: boolean;
}

@Injectable()
export class PermissionService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  findAll() {
    return this.prisma.levelPermission.findMany({
      orderBy: { levelid: 'asc' },
    });
  }

  async setForLevel(levelid: number, permissions: PermissionEntry[], meta?: ActionMeta) {
    const level = await this.prisma.level.findUnique({ where: { levelid } });
    if (!level) throw new NotFoundException('Level not found.');

    await this.prisma.$transaction([
      this.prisma.levelPermission.deleteMany({ where: { levelid } }),
      ...(permissions.length
        ? [
            this.prisma.levelPermission.createMany({
              data: permissions.map((p) => ({
                levelid,
                page: p.page,
                action: p.action,
                granted: p.granted,
              })),
            }),
          ]
        : []),
    ]);

    await this.activity.log(
      `UPDATE permissions #${levelid} (${level.levelname}) — ${permissions.length} rules`,
      meta,
    );
    return { saved: permissions.length };
  }
}