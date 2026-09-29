import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { TenantRequestService } from './tenant-request.service';

@Controller('tenant-requests')
export class TenantRequestController {
  constructor(private readonly tenantRequestService: TenantRequestService) {}

  @Get()
  findAll(@Query('userid') userid?: string) {
    return this.tenantRequestService.findAll(userid ? Number(userid) : undefined);
  }

  @Get('available')
  available() {
    return this.tenantRequestService.availableLocations();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantRequestService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      userid: number;
      locationid: number;
      durationMonths: number;
      paymentMethod?: string;
      businessName: string;
      businessCategory: string;
      description?: string;
      phone?: string;
      contractStart?: string;
    },
  ) {
    return this.tenantRequestService.create(body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: string }) {
    return this.tenantRequestService.updateStatus(id, body.status);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenantRequestService.remove(id);
  }
}
