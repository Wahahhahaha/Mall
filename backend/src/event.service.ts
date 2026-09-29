import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ActivityService, type ActionMeta } from './activity.service';

@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  findAll() {
    return this.prisma.event.findMany({
      where: { isDeleted: false },
      include: { floor: true },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { eventid: id },
      include: { floor: true },
    });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }

  create(data: {
    name: string;
    description?: string;
    floorid?: number | null;
    location: string;
    startDate: string;
    endDate: string;
    posters?: string[];
  }) {
    return this.prisma.event.create({
      data: {
        name: data.name,
        description: data.description?.trim() || null,
        floorid: data.floorid ? Number(data.floorid) : null,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        posters: data.posters || [],
      },
      include: { floor: true },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string | null;
      floorid?: number | null;
      location?: string;
      startDate?: string;
      endDate?: string;
      posters?: string[];
    },
  ) {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) {
      payload.description = data.description?.trim() || null;
    }
    if (data.floorid !== undefined) {
      payload.floorid = data.floorid ? Number(data.floorid) : null;
    }
    if (data.location !== undefined) payload.location = data.location;
    if (data.startDate !== undefined) {
      payload.startDate = new Date(data.startDate);
    }
    if (data.endDate !== undefined) payload.endDate = new Date(data.endDate);
    if (data.posters !== undefined) payload.posters = data.posters;
    return this.prisma.event.update({
      where: { eventid: id },
      data: payload,
      include: { floor: true },
    });
  }

  async remove(id: number, meta?: ActionMeta) {
    const event = await this.prisma.event.findFirst({
      where: { eventid: id, isDeleted: false },
    });
    if (!event) throw new NotFoundException('Event not found.');
    await this.prisma.event.update({ where: { eventid: id }, data: { isDeleted: true } });
    await this.activity.recordDelete('event', id, event.name, meta);
    return { removed: event.name };
  }
}
