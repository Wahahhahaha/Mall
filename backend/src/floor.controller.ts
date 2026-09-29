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
import { FloorService } from './floor.service';

@Controller('floors')
export class FloorController {
  constructor(private readonly floorService: FloorService) {}

  @Get()
  findAll() {
    return this.floorService.findAll();
  }

  @Post()
  create(@Body() body: { floorname: string; floorcode?: string }) {
    return this.floorService.create(body);
  }

  @Post('reorder')
  reorder(@Body() body: { orderedIds: number[]; meta?: any }) {
    return this.floorService.reorder(body.orderedIds, body.meta);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { floorname?: string; floorcode?: string },
  ) {
    return this.floorService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.floorService.remove(id, body?.meta);
  }
}
