import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  create(@Body() body: { email: string; password?: string; levelid: number }) {
    return this.userService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { email?: string; levelid?: number; password?: string; phone?: string | null },
  ) {
    return this.userService.update(id, body);
  }

  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(id, body.currentPassword, body.newPassword);
  }

  @Patch(':id/reset-password')
  resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.userService.resetPassword(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.userService.remove(id, body?.meta);
  }
}
