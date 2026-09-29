import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LevelController } from './level.controller';
import { LevelService } from './level.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FloorController } from './floor.controller';
import { FloorService } from './floor.service';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { ParkirController } from './parkir.controller';
import { ParkirService } from './parkir.service';
import { UploadsController } from './uploads.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { TenantRequestController } from './tenant-request.controller';
import { TenantRequestService } from './tenant-request.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { TrashController } from './trash.controller';
import { TrashService } from './trash.service';
import { TenantPaymentController } from './tenant-payment.controller';
import { TenantPaymentService } from './tenant-payment.service';
import { MidtransService } from './midtrans.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
    MailerModule.forRootAsync({
      useFactory: () => {
        const host = process.env.MAIL_HOST;
        return {
          transport: host
            ? {
                host,
                port: Number(process.env.MAIL_PORT || 587),
                secure: process.env.MAIL_SECURE === 'true',
                auth: process.env.MAIL_USER
                  ? {
                      user: process.env.MAIL_USER,
                      pass: process.env.MAIL_PASS,
                    }
                  : undefined,
              }
            : { jsonTransport: true },
          defaults: {
            from: process.env.MAIL_FROM || '"SIM Mall" <no-reply@mall.local>',
          },
        };
      },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    LevelController,
    UserController,
    FloorController,
    EventController,
    TenantController,
    ParkirController,
    UploadsController,
    SettingsController,
    LocationController,
    TenantRequestController,
    ChatController,
    BackupController,
    ActivityController,
    TrashController,
    TenantPaymentController,
    PermissionController,
    ReportController,
  ],
  providers: [
    AppService,
    PrismaService,
    AuthService,
    LevelService,
    UserService,
    FloorService,
    EventService,
    TenantService,
    ParkirService,
    SettingsService,
    LocationService,
    TenantRequestService,
    ChatService,
    BackupService,
    ActivityService,
    TrashService,
    TenantPaymentService,
    MidtransService,
    PermissionService,
    ReportService,
  ],
})
export class AppModule {}
