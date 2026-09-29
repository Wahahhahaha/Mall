import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class ParkirService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const [active, history] = await Promise.all([
      this.prisma.parkingTicket.findMany({
        where: { exitAt: null },
        orderBy: { entryAt: 'desc' },
      }),
      this.prisma.parkingTicket.findMany({
        where: { exitAt: { not: null } },
        orderBy: { exitAt: 'desc' },
      }),
    ]);
    const revenue = history.reduce((sum, t) => sum + (t.fee ?? 0), 0);
    return {
      active,
      history,
      stats: { activeCount: active.length, revenue },
    };
  }

  async createEntry(data: { plate: string; type: string; userId?: number }) {
    const plate = data.plate.trim().toUpperCase();
    if (!plate) throw new ConflictException('License plate number is required.');
    const open = await this.prisma.parkingTicket.findFirst({
      where: { plate, exitAt: null },
    });
    if (open) {
      throw new ConflictException('A vehicle with that plate is still recorded inside.');
    }
    return this.prisma.parkingTicket.create({
      data: { plate, type: data.type, entryBy: data.userId ?? null },
    });
  }

  async checkout(id: number, data: { fee?: number; userId?: number }) {
    const ticket = await this.prisma.parkingTicket.findUnique({
      where: { ticketid: id },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    if (ticket.exitAt) {
      throw new ConflictException('This vehicle has already exited.');
    }
    return this.prisma.parkingTicket.update({
      where: { ticketid: id },
      data: { exitAt: new Date(), fee: data.fee ?? 0, exitBy: data.userId ?? null },
    });
  }

  remove(id: number) {
    return this.prisma.parkingTicket.delete({ where: { ticketid: id } });
  }
}
