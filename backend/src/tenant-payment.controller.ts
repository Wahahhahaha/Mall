import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { TenantPaymentService } from './tenant-payment.service';

@Controller('tenant-payments')
export class TenantPaymentController {
  constructor(private readonly tenantPaymentService: TenantPaymentService) {}

  @Get()
  findAll(
    @Query('tenantid') tenantid?: string,
    @Query('period') period?: string,
    @Query('status') status?: string,
    @Query('userid') userid?: string,
  ) {
    return this.tenantPaymentService.findAll({
      tenantid: tenantid ? Number(tenantid) : undefined,
      period,
      status,
      userid: userid ? Number(userid) : undefined,
    });
  }

  @Post('generate')
  generate(@Body() body: { period: string }) {
    return this.tenantPaymentService.generate(body.period);
  }

  @Post(':id/begin-payment')
  beginPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { returnUrl?: string },
  ) {
    return this.tenantPaymentService.beginPayment(id, body?.returnUrl);
  }

  @Get(':id/status')
  refreshStatus(@Param('id', ParseIntPipe) id: number) {
    return this.tenantPaymentService.refreshMidtransStatus(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantPaymentService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      tenantid: number;
      period: string;
      amount?: number;
      status?: string;
      method?: string | null;
      paidAt?: string | null;
      notes?: string | null;
    },
  ) {
    return this.tenantPaymentService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      amount?: number;
      status?: string;
      method?: string | null;
      paidAt?: string | null;
      notes?: string | null;
    },
  ) {
    return this.tenantPaymentService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenantPaymentService.remove(id);
  }
}
