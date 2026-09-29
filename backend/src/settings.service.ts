import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface SystemSettings {
  systemName: string;
  systemLogo: string | null;
  systemFavicon: string | null;
  systemContact: string | null;
  systemAddress: string | null;
  logoMode: boolean;
  updatedAt: Date;
}

export type SystemSettingsInput = Partial<
  Pick<SystemSettings, 'systemName' | 'systemLogo' | 'systemFavicon' | 'systemContact' | 'systemAddress' | 'logoMode'>
>;

const SETTINGS_ID = 1;
const DEFAULT_NAME = 'SIM MALL';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<SystemSettings> {
    const row = await this.prisma.setting.findUnique({ where: { id: SETTINGS_ID } });
    if (row) return row;
    return this.prisma.setting.create({ data: { id: SETTINGS_ID, systemName: DEFAULT_NAME } });
  }

  async setMany(data: SystemSettingsInput): Promise<SystemSettings> {
    const payload: Record<string, unknown> = {};

    if (typeof data.systemName === 'string') payload.systemName = data.systemName.trim() || DEFAULT_NAME;
    if (typeof data.systemLogo === 'string') payload.systemLogo = data.systemLogo.trim() || null;
    if (typeof data.systemFavicon === 'string') payload.systemFavicon = data.systemFavicon.trim() || null;
    if (typeof data.systemContact === 'string') payload.systemContact = data.systemContact.trim() || null;
    if (typeof data.systemAddress === 'string') payload.systemAddress = data.systemAddress.trim() || null;
    if (typeof data.logoMode === 'boolean') payload.logoMode = data.logoMode;

    await this.getAll();

    return this.prisma.setting.update({
      where: { id: SETTINGS_ID },
      data: payload,
    });
  }

  async getFaviconPath(): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { id: SETTINGS_ID } });
    return row?.systemFavicon || null;
  }

  /** Sender header: display name follows the configured system name, address from MAIL_FROM / MAIL_USER. */
  async mailFrom(): Promise<string> {
    const { systemName } = await this.getAll();
    const raw = (process.env.MAIL_FROM ?? '').trim();
    const explicit = raw.match(/<([^>]+)>/)?.[1] ?? raw.replace(/^"[^"]*"\s*/, '').trim();
    const addr = explicit || (process.env.MAIL_USER ?? '').trim() || 'no-reply@localhost';
    return `"${systemName}" <${addr}>`;
  }
}
