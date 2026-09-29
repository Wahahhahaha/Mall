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
import { LevelService } from './level.service';

@Controller('levels')
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Get()
  findAll() {
    return this.levelService.findAll();
  }

  @Post()
  create(@Body() body: { levelname: string; description?: string }) {
    return this.levelService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { levelname?: string; description?: string },
  ) {
    return this.levelService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.levelService.remove(id, body?.meta);
  }
}
