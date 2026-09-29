import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

export const BACKUP_DIR = join(process.cwd(), 'backups');

export interface StoredBackup {
  name: string;
  size: string;
  date: string;
}

interface TableDef {
  dbTable: string;
  createSql: string;
  rows: () => Promise<Record<string, unknown>[]>;
}

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {
    if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  }

  async create() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `mall-backup-${stamp}.sql`;
    const full = join(BACKUP_DIR, name);

    const sql = await this.buildSql();
    writeFileSync(full, sql, 'utf-8');
    return this.describe(name);
  }

  private async buildSql(): Promise<string> {
    const header = [
      '-- ================================================',
      '-- Mall Management Information System - Database Backup',
      `-- Exported: ${new Date().toISOString()}`,
      '-- Format: SQL (PostgreSQL)',
      '-- ================================================',
      '',
      'SET statement_timeout = 0;',
      'SET client_encoding = \'UTF8\';',
      'SET timezone = \'UTC\';',
      '',
    ];

    const bodies: string[] = [];
    const tables: TableDef[] = [
      {
        dbTable: 'level',
        createSql: 'CREATE TABLE IF NOT EXISTS "level" ("levelid" SERIAL PRIMARY KEY, "levelname" TEXT NOT NULL UNIQUE, "is_deleted" BOOLEAN NOT NULL DEFAULT false);',
        rows: () => this.prisma.level.findMany(),
      },
      {
        dbTable: 'users',
        createSql: 'CREATE TABLE IF NOT EXISTS "users" ("userid" SERIAL PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "password" TEXT NOT NULL, "levelid" INTEGER, "phone" TEXT, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ);',
        rows: () => this.prisma.user.findMany(),
      },
      {
        dbTable: 'floors',
        createSql: 'CREATE TABLE IF NOT EXISTS "floors" ("floorid" SERIAL PRIMARY KEY, "floorname" TEXT NOT NULL UNIQUE, "floorcode" TEXT UNIQUE, "sortOrder" INTEGER NOT NULL DEFAULT 0, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ);',
        rows: () => this.prisma.floor.findMany(),
      },
      {
        dbTable: 'locations',
        createSql: 'CREATE TABLE IF NOT EXISTS "locations" ("id" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "floorid" INTEGER REFERENCES "floors"("floorid") ON DELETE SET NULL, "x" DOUBLE PRECISION NOT NULL, "y" DOUBLE PRECISION NOT NULL, "pricePerYear" INTEGER DEFAULT 50000000, "minLeaseYears" INTEGER NOT NULL DEFAULT 1, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ, "updatedAt" TIMESTAMPTZ);',
        rows: () => this.prisma.location.findMany(),
      },
      {
        dbTable: 'tenants',
        createSql: 'CREATE TABLE IF NOT EXISTS "tenants" ("tenantid" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "category" TEXT, "logoUrl" TEXT, "leaseUntil" TIMESTAMPTZ, "locationid" INTEGER UNIQUE REFERENCES "locations"("id") ON DELETE SET NULL, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ);',
        rows: () => this.prisma.tenant.findMany(),
      },
      {
        dbTable: 'events',
        createSql: 'CREATE TABLE IF NOT EXISTS "events" ("eventid" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT, "floorid" INTEGER REFERENCES "floors"("floorid") ON DELETE SET NULL, "location" TEXT NOT NULL, "startDate" TIMESTAMPTZ, "endDate" TIMESTAMPTZ, "posters" TEXT[] DEFAULT ARRAY[]::TEXT[], "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ);',
        rows: () => this.prisma.event.findMany(),
      },
      {
        dbTable: 'parking_tickets',
        createSql: 'CREATE TABLE IF NOT EXISTS "parking_tickets" ("ticketid" SERIAL PRIMARY KEY, "plate" TEXT NOT NULL, "type" TEXT NOT NULL, "entryAt" TIMESTAMPTZ, "exitAt" TIMESTAMPTZ, "fee" INTEGER, "entryBy" INTEGER, "exitBy" INTEGER, "createdAt" TIMESTAMPTZ);',
        rows: () => this.prisma.parkingTicket.findMany(),
      },
      {
        dbTable: 'settings',
        createSql: 'CREATE TABLE IF NOT EXISTS "settings" ("id" INTEGER NOT NULL DEFAULT 1, "systemName" TEXT NOT NULL DEFAULT \'SIM MALL\', "systemLogo" TEXT, "systemFavicon" TEXT, "systemContact" TEXT, "systemAddress" TEXT, "logoMode" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMPTZ);',
        rows: () => this.prisma.setting.findMany(),
      },
      {
        dbTable: 'tenant_requests',
        createSql: 'CREATE TABLE IF NOT EXISTS "tenant_requests" ("id" SERIAL PRIMARY KEY, "userid" INTEGER NOT NULL, "locationid" INTEGER NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE, "durationMonths" INTEGER NOT NULL, "totalFee" INTEGER NOT NULL, "paymentMethod" TEXT, "businessName" TEXT NOT NULL, "businessCategory" TEXT, "description" TEXT, "phone" TEXT, "status" TEXT DEFAULT \'Pending\', "contractStart" TIMESTAMPTZ, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ, "updatedAt" TIMESTAMPTZ);',
        rows: () => this.prisma.tenantRequest.findMany(),
      },
      {
        dbTable: 'tenant_payments',
        createSql: 'CREATE TABLE IF NOT EXISTS "tenant_payments" ("paymentid" SERIAL PRIMARY KEY, "tenantid" INTEGER NOT NULL REFERENCES "tenants"("tenantid") ON DELETE CASCADE, "locationid" INTEGER REFERENCES "locations"("id") ON DELETE SET NULL, "period" TEXT NOT NULL, "amount" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT \'Unpaid\', "method" TEXT, "paidAt" TIMESTAMPTZ, "notes" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now());',
        rows: () => this.prisma.tenantPayment.findMany(),
      },
      {
        dbTable: 'activity_logs',
        createSql: 'CREATE TABLE IF NOT EXISTS "activity_logs" ("id" SERIAL PRIMARY KEY, "datetime" TIMESTAMPTZ NOT NULL DEFAULT now(), "ip" TEXT, "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION, "userid" INTEGER REFERENCES "users"("userid") ON DELETE SET NULL, "email" TEXT, "action" TEXT NOT NULL);',
        rows: () => this.prisma.activityLog.findMany(),
      },
    ];

    for (const t of tables) {
      bodies.push(`TRUNCATE TABLE "${t.dbTable}" RESTART IDENTITY CASCADE;`);
      bodies.push(t.createSql);
      const rows = await t.rows();
      if (rows.length > 0) {
        bodies.push(this.insertSql(t.dbTable, rows));
      }
      bodies.push('');
    }

    return [
      ...header,
      'BEGIN;',
      '',
      ...bodies.flatMap((b) => b.split('\n')),
      'COMMIT;',
      '',
    ].join('\n');
  }

  private insertSql(dbTable: string, rows: Record<string, unknown>[]): string {
    const fields = Object.keys(rows[0]);
    const cols = fields.map((f) => `"${f}"`).join(', ');
    const lines = rows.map((row) => {
      const vals = fields.map((f) => this.toSqlValue(row[f]));
      return `(${vals.join(', ')})`;
    });
    return `INSERT INTO "${dbTable}" (${cols}) VALUES\n${lines.join(',\n')};`;
  }

  private toSqlValue(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString()}'`;
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  list(): StoredBackup[] {
    const names = readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.sql'));
    return names
      .map((name) => this.describe(name))
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }

  private describe(name: string): StoredBackup {
    const full = join(BACKUP_DIR, name);
    const st = statSync(full);
    return {
      name,
      size: formatBytes(st.size),
      date: st.mtime.toISOString().slice(0, 19).replace('T', ' '),
    };
  }

  downloadResolvable(name: string): string {
    this.assertSafe(name);
    const full = join(BACKUP_DIR, name);
    if (!existsSync(full)) throw new NotFoundException('Backup file not found.');
    return full;
  }

  read(name: string): string {
    const full = this.downloadResolvable(name);
    return readFileSync(full, 'utf-8');
  }

  remove(name: string) {
    this.assertSafe(name);
    const full = join(BACKUP_DIR, name);
    if (!existsSync(full)) throw new NotFoundException('Backup file not found.');
    unlinkSync(full);
    return { removed: name };
  }

  nameValid(name: string): boolean {
    return /^mall-backup-[\w.-]+\.sql$/.test(name);
  }

  private assertSafe(name: string) {
    if (!this.nameValid(name) || name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new BadRequestException('Invalid backup file name.');
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
