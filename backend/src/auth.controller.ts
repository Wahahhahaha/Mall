import { Controller, Post, Body, HttpCode, HttpStatus, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() body: any) {
    return this.authService.googleLogin(body.credential);
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() body: any) {
    return this.authService.requestOtp(body.email);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: any) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any, @Req() req: Request) {
    const ipRaw = req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress;
    const ip = typeof ipRaw === 'string' ? ipRaw.split(',')[0] : undefined;
    return this.authService.register(body.email, body.password, body.recaptchaToken as string | undefined, ip);
  }

  @Get('stats')
  async getStats() {
    return this.authService.getStats();
  }
}
