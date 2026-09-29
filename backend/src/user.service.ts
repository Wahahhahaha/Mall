import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ActivityService, type ActionMeta } from './activity.service';
import * as bcrypt from 'bcrypt';

export const DEFAULT_PASSWORD = '12345678';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { isDeleted: false },
      orderBy: { userid: 'asc' },
      include: { level: true },
    });
  }

  async create(data: { email: string; password?: string; levelid: number }) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) throw new ConflictException('Email is already registered');
    const password = await bcrypt.hash(data.password || DEFAULT_PASSWORD, 10);
    return this.prisma.user.create({
      data: { email: data.email, password, levelid: data.levelid },
      include: { level: true },
    });
  }

  async update(
    id: number,
    data: { email?: string; levelid?: number; password?: string; phone?: string | null },
  ) {
    const payload: Record<string, unknown> = {};
    if (data.email) payload.email = data.email;
    if (data.levelid) payload.levelid = data.levelid;
    if (data.password) payload.password = await bcrypt.hash(data.password, 10);
    if (data.phone !== undefined) payload.phone = data.phone;
    return this.prisma.user.update({
      where: { userid: id },
      data: payload,
      include: { level: true },
    });
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { userid: id },
    });
    if (!user) throw new BadRequestException('User not found');

    const isMatch =
      (await bcrypt.compare(currentPassword, user.password)) ||
      currentPassword === user.password;
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { userid: id },
      data: { password: hashed },
      select: { userid: true, email: true },
    });
  }

  async remove(id: number, meta?: ActionMeta) {
    const user = await this.prisma.user.findFirst({ where: { userid: id, isDeleted: false } });
    if (!user) throw new NotFoundException('User not found.');
    await this.prisma.user.update({ where: { userid: id }, data: { isDeleted: true } });
    await this.activity.recordDelete('user', id, user.email, meta);
    return { removed: user.email };
  }

  async resetPassword(id: number, defaultPassword = DEFAULT_PASSWORD) {
    const hashed = await bcrypt.hash(defaultPassword, 10);
    return this.prisma.user.update({
      where: { userid: id },
      data: { password: hashed },
      include: { level: true },
    });
  }
}
