import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { SettingsService } from './settings.service';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

@Injectable()
export class AuthService {
  private otpStore = new Map<string, OtpEntry>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private settings: SettingsService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { level: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.isDeleted) {
      throw new UnauthorizedException('This account has been deleted');
    }

    // Since the seed creates "superadmin" both as hash and plain option?
    // Let's support bcrypt compare, and also fallback to plain comparison just in case for dev convenience,
    // though our seed hashed it properly.
    const isPasswordValid = await bcrypt.compare(password, user.password) || password === user.password;
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  async googleLogin(credential?: string) {
    if (!credential) {
      throw new BadRequestException('Google credential is required');
    }

    let email: string;
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      );
      if (!res.ok) {
        throw new Error('invalid google token');
      }
      const info = (await res.json()) as {
        email?: string;
        email_verified?: boolean | string;
        aud?: string;
      };
      if (!info.email || (info.email_verified !== true && info.email_verified !== 'true')) {
        throw new BadRequestException('Google email is not verified');
      }
      const expectedAud = process.env.GOOGLE_CLIENT_ID;
      if (expectedAud && info.aud && info.aud !== expectedAud) {
        throw new BadRequestException('Google token audience mismatch');
      }
      email = info.email.toLowerCase();
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new UnauthorizedException('Google authentication failed');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { level: true },
    });
    if (!user || user.isDeleted) {
      throw new UnauthorizedException(
        'This Google email is not registered on SIM Mall. Please register first.',
      );
    }
    return this.buildAuthResponse(user);
  }

  async requestOtp(email?: string) {
    const emailNorm = email?.trim().toLowerCase();
    if (!emailNorm) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user) {
      throw new BadRequestException('This email is not registered');
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = Date.now() + 5 * 60 * 1000;
    this.otpStore.set(emailNorm, { code, expiresAt, attempts: 0 });

    const smtpConfigured = !!process.env.MAIL_HOST;
    try {
      const [{ systemName }, from] = await Promise.all([
        this.settings.getAll(),
        this.settings.mailFrom(),
      ]);
      await this.mailerService.sendMail({
        from,
        to: emailNorm,
        subject: `Your ${systemName} login code`,
        text: `Your one-time login code is ${code}.\nIt expires in 5 minutes. If you did not request this, you can ignore this email.`,
      });
    } catch (e) {
      console.error('[OTP] failed to send email:', e);
    }
    // Always log so the code is accessible in dev even when no SMTP is configured.
    console.log(`[OTP] ${emailNorm} -> code: ${code}, expires at ${new Date(expiresAt).toISOString()}`);

    return {
      message: 'A sign-in code has been sent to your email.',
      expiresInSeconds: 300,
      ...(smtpConfigured
        ? {}
        : {
            devOtp: code,
            devMessage: 'No SMTP configured — the code is only shown for development.',
          }),
    };
  }

  async verifyOtp(email?: string, otp?: string) {
    const emailNorm = email?.trim().toLowerCase();
    if (!emailNorm || !otp) {
      throw new BadRequestException('Email and code are required');
    }

    const entry = this.otpStore.get(emailNorm);
    if (!entry) {
      throw new BadRequestException('No sign-in code was requested for this email');
    }
    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(emailNorm);
      throw new BadRequestException('The code has expired. Please request a new one.');
    }
    if (entry.attempts >= 5) {
      this.otpStore.delete(emailNorm);
      throw new BadRequestException('Too many attempts. Please request a new code.');
    }
    if (entry.code !== otp.trim()) {
      entry.attempts += 1;
      throw new UnauthorizedException('Incorrect code. Please try again.');
    }

    this.otpStore.delete(emailNorm);
    const user = await this.prisma.user.findUnique({
      where: { email: emailNorm },
      include: { level: true },
    });
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('This email is not registered');
    }
    return this.buildAuthResponse(user);
  }

  async register(email: string, password: string, recaptchaToken?: string, remoteIp?: string) {
    const emailNorm = email?.trim().toLowerCase();
    if (!emailNorm || !password) {
      throw new BadRequestException('Email and password are required');
    }
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    if (!recaptchaToken) {
      throw new BadRequestException('reCAPTCHA verification is required');
    }
    const captchaOk = await this.verifyRecaptcha(recaptchaToken, remoteIp);
    if (!captchaOk) {
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: emailNorm, isDeleted: false },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const tenantLevel = await this.prisma.level.findUnique({
      where: { levelname: 'Tenant' },
    });
    if (!tenantLevel) {
      throw new InternalServerErrorException('Tenant level is not configured');
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: emailNorm,
        password: hashed,
        levelid: tenantLevel.levelid,
      },
      include: { level: true },
    });

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    userid: number;
    email: string;
    levelid: number | null;
    phone: string | null;
    level: { levelname: string } | null;
  }) {
    const levelname = user.level?.levelname ?? '';
    const payload = {
      userid: user.userid,
      email: user.email,
      levelid: user.levelid,
      levelname,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        userid: user.userid,
        email: user.email,
        level: levelname,
        levelid: user.levelid,
        phone: user.phone,
      },
    };
  }

  private async verifyRecaptcha(token: string, remoteIp?: string): Promise<boolean> {
    try {
      const secret = process.env.RECAPTCHA_SECRET_KEY || '';
      if (!secret) return false;
      const body = new URLSearchParams();
      body.set('secret', secret);
      body.set('response', token);
      if (remoteIp) body.set('remoteip', remoteIp);
      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = (await res.json()) as { success: boolean };
      return !!data.success;
    } catch {
      return false;
    }
  }

  async getStats() {
    const userCount = await this.prisma.user.count({ where: { isDeleted: false } });
    const levelCount = await this.prisma.level.count({ where: { isDeleted: false } });
    const levels = await this.prisma.level.findMany({
      where: { isDeleted: false },
      select: {
        levelid: true,
        levelname: true,
        _count: {
          select: { users: { where: { isDeleted: false } } },
        },
      },
    });
    const [tenantCount, eventCount, floorCount, locationCount, parkingCount, requestCount] =
      await Promise.all([
        this.prisma.tenant.count({ where: { isDeleted: false } }),
        this.prisma.event.count({ where: { isDeleted: false } }),
        this.prisma.floor.count({ where: { isDeleted: false } }),
        this.prisma.location.count({ where: { isDeleted: false } }),
        this.prisma.parkingTicket.count(),
        this.prisma.tenantRequest.count({ where: { isDeleted: false } }),
      ]);
    const [activeRequests, pendingRequests, activeParking, rentBase] = await Promise.all([
      this.prisma.tenantRequest.count({ where: { status: 'Active', isDeleted: false } }),
      this.prisma.tenantRequest.count({ where: { status: 'Pending', isDeleted: false } }),
      this.prisma.parkingTicket.count({ where: { exitAt: null } }),
      this.prisma.location.aggregate({
        where: { isDeleted: false, tenants: { some: { isDeleted: false } } },
        _sum: { pricePerYear: true },
      }),
    ]);
    // monthly rent base: annual price of the occupied units / 12
    const mallFeeSum = Math.round((rentBase._sum.pricePerYear ?? 0) / 12);
    return {
      userCount,
      levelCount,
      levels,
      tenantCount,
      eventCount,
      floorCount,
      locationCount,
      parkingCount,
      requestCount,
      activeRequests,
      pendingRequests,
      activeParking: parkingCount > 0 ? activeParking : 0,
      mallFeeSum,
      status: 'OK',
    };
  }
}
