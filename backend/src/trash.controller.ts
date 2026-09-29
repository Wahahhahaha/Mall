import { Controller, Get, Post, Delete, Param, Query, ParseIntPipe } from '@nestjs/common';
import { TrashService, TRASH_TYPES } from './trash.service';

@Controller('trash')
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Get('types')
  types() {
    return TRASH_TYPES;
  }

  @Get()
  list(@Query('entityType') entityType?: string) {
    return this.trashService.list(entityType);
  }

  @Post(':type/:id/restore')
  restore(@Param('type') type: string, @Param('id', ParseIntPipe) id: number) {
    return this.trashService.restore(type, id);
  }

  @Delete(':type/:id')
  purge(@Param('type') type: string, @Param('id', ParseIntPipe) id: number) {
    return this.trashService.purge(type, id);
  }
}
