import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ActivityService, type ActionMeta } from './activity.service';

@Injectable()
export class LevelService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  findAll() {
    return this.prisma.level.findMany({
      where: { isDeleted: false },
      orderBy: { levelid: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async create(data: { levelname: string; description?: string }) {
    const exists = await this.prisma.level.findUnique({
      where: { levelname: data.levelname },
    });
    if (exists) throw new ConflictException('Level name is already taken');
    return this.prisma.level.create({ data });
  }

  async update(id: number, data: { levelname?: string; description?: string }) {
    return this.prisma.level.update({ where: { levelid: id }, data });
  }

  async remove(id: number, meta?: ActionMeta) {
    const level = await this.prisma.level.findFirst({
      where: { levelid: id, isDeleted: false },
      include: { _count: { select: { users: true } } },
    });
    if (!level) throw new NotFoundException('Level not found.');
    if (level._count.users > 0) {
      throw new ConflictException(
        `Cannot delete: ${level._count.users} user(s) still assigned to this level.`,
      );
    }
    await this.prisma.level.update({ where: { levelid: id }, data: { isDeleted: true } });
    await this.activity.recordDelete('level', id, level.levelname, meta);
    return { removed: level.levelname };
  }
}
