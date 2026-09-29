import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  findAll(@Query('floorid') floorid?: string, @Query('search') search?: string) {
    return this.locationService.findAll({
      floorid: floorid ? Number(floorid) : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      floorid?: number | null;
      x: number;
      y: number;
      pricePerYear?: number | null;
      minLeaseYears?: number;
    },
  ) {
    return this.locationService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      floorid?: number | null;
      x?: number;
      y?: number;
      pricePerYear?: number | null;
      minLeaseYears?: number;
    },
  ) {
    return this.locationService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.locationService.remove(id, body?.meta);
  }
}
