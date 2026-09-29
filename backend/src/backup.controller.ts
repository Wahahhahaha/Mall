import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { BackupService } from './backup.service';

@Controller('backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  list() {
    return this.backupService.list();
  }

  @Post()
  create() {
    return this.backupService.create();
  }

  @Get(':name/download')
  download(@Param('name') name: string, @Res() res: Response) {
    const full = this.backupService.downloadResolvable(name);
    res.download(full, name);
  }

  @Delete(':name')
  remove(@Param('name') name: string) {
    return this.backupService.remove(name);
  }
}
