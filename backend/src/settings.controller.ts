import {
  Controller,
  Get,
  Patch,
  Res,
  Body,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { SettingsService, type SystemSettingsInput } from './settings.service';
import { UPLOADS_DIR } from './uploads.controller';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Get('favicon')
  async getFavicon(@Res() res: Response) {
    const path = await this.settingsService.getFaviconPath();
    if (!path) throw new NotFoundException('Favicon not configured.');
    // The stored value may be a relative /uploads/... path
    const fileName = path.replace(/^\/uploads\//, '');
    const full = join(UPLOADS_DIR, fileName);
    if (!existsSync(full)) throw new NotFoundException('Favicon file not found.');
    res.sendFile(full);
  }

  @Patch()
  setMany(@Body() body: SystemSettingsInput) {
    return this.settingsService.setMany(body);
  }
}
