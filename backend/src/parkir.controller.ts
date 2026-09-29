import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ParkirService } from './parkir.service';

@Controller('parkir')
export class ParkirController {
  constructor(private readonly parkirService: ParkirService) {}

  @Get()
  findAll() {
    return this.parkirService.findAll();
  }

  @Post('entry')
  createEntry(@Body() body: { plate: string; type: string; userId?: number }) {
    return this.parkirService.createEntry(body);
  }

  @Post(':id/exit')
  checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { fee?: number; userId?: number },
  ) {
    return this.parkirService.checkout(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parkirService.remove(id);
  }
}
