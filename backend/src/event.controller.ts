import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { EventService } from './event.service';
import type { ActionMeta } from './activity.service';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  findAll() {
    return this.eventService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
      floorid?: number | null;
      location: string;
      startDate: string;
      endDate: string;
      posters?: string[];
    },
  ) {
    return this.eventService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      description?: string | null;
      floorid?: number | null;
      location?: string;
      startDate?: string;
      endDate?: string;
      posters?: string[];
    },
  ) {
    return this.eventService.update(id, body);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { meta?: ActionMeta },
  ) {
    return this.eventService.remove(id, body?.meta);
  }
}
