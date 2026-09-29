import { Controller, Get, Put, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PermissionService, type PermissionEntry } from './permission.service';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  findAll() {
    return this.permissionService.findAll();
  }

  @Put(':levelid')
  setForLevel(
    @Param('levelid', ParseIntPipe) levelid: number,
    @Body() body: { permissions: PermissionEntry[]; meta?: Record<string, unknown> },
  ) {
    return this.permissionService.setForLevel(
      levelid,
      body.permissions ?? [],
      body.meta as never,
    );
  }
}