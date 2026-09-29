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
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  findAll() {
    return this.tenantService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      category: string;
      leaseUntil?: string | null;
      locationid?: number | null;
      logoUrl?: string | null;
    },
  ) {
    return this.tenantService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category?: string;
      leaseUntil?: string | null;
      locationid?: number | null;
      logoUrl?: string | null;
    },
  ) {
    return this.tenantService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.tenantService.remove(id, body?.meta);
  }
}
