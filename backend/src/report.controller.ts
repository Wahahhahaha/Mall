import { Controller, Get, Query } from '@nestjs/common';
import { ReportService, type ReportGranularity } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('summary')
  summary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('granularity') granularity?: ReportGranularity,
  ) {
    return this.reportService.summary({ from, to, granularity });
  }
}
