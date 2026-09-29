import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ActivityService, type ActionMeta } from './activity.service';

interface EntitySpec {
  type: string;
  label: string;
  model: 'user' | 'level' | 'floor' | 'location' | 'tenant' | 'event' | 'tenantRequest';
  pk: string;
  nameField: string;
  // `level` has no created_at column, so it cannot be sorted by timestamp
  hasCreatedAt?: boolean;
}

const SPECS: EntitySpec[] = [
  { type: 'user', label: 'User', model: 'user', pk: 'userid', nameField: 'email' },
  { type: 'tenant', label: 'Tenant', model: 'tenant', pk: 'tenantid', nameField: 'name' },
  { type: 'location', label: 'Location', model: 'location', pk: 'id', nameField: 'name' },
  { type: 'event', label: 'Event', model: 'event', pk: 'eventid', nameField: 'name' },
  { type: 'floor', label: 'Floor', model: 'floor', pk: 'floorid', nameField: 'floorname' },
  { type: 'level', label: 'Level', model: 'level', pk: 'levelid', nameField: 'levelname', hasCreatedAt: false },
  { type: 'request', label: 'Tenant Request', model: 'tenantRequest', pk: 'id', nameField: 'businessName' },
];

export const TRASH_TYPES = SPECS.map((s) => ({ type: s.type, label: s.label }));

@Injectable()
export class TrashService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  /** Aggregates every master-data row flagged is_deleted = true into one list. */
  async list(entityType?: string) {
    const specs = entityType ? SPECS.filter((s) => s.type === entityType) : SPECS;
    if (entityType && specs.length === 0) {
      throw new BadRequestException(`Unknown trash type "${entityType}".`);
    }

    const groups = await Promise.all(
      specs.map(async (spec) => {
        const model = this.prisma[spec.model] as any;
        const withTs = spec.hasCreatedAt !== false;
        const rows = await model.findMany({
          where: { isDeleted: true },
          select: {
            [spec.pk]: true,
            [spec.nameField]: true,
            ...(withTs ? { createdAt: true } : {}),
          },
          orderBy: withTs ? { createdAt: 'desc' } : { [spec.nameField]: 'asc' },
        });
        return rows.map((row: Record<string, any>) => ({
          entityType: spec.type,
          entityLabel: spec.label,
          entityId: row[spec.pk] as number,
          name: String(row[spec.nameField] ?? `#${row[spec.pk]}`),
          createdAt: row.createdAt as Date | null,
        }));
      }),
    );

    return groups
      .flat()
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async restore(type: string, id: number, meta?: ActionMeta) {
    const spec = this.spec(type);
    const model = this.prisma[spec.model] as any;
    const row = await model.findUnique({ where: { [spec.pk]: id } });
    if (!row) throw new NotFoundException(`${spec.label} not found`);

    const restored = await model.update({
      where: { [spec.pk]: id },
      data: { isDeleted: false },
    });
    const name = String(row[spec.nameField] ?? `#${id}`);
    await this.activity.log(`RESTORE ${spec.type} #${id} (${name})`, meta);
    return { restored: name, data: restored };
  }

  async purge(type: string, id: number, meta?: ActionMeta) {
    const spec = this.spec(type);
    const model = this.prisma[spec.model] as any;
    const row = await model.findUnique({ where: { [spec.pk]: id } });
    if (!row) throw new NotFoundException(`${spec.label} not found`);

    const name = String(row[spec.nameField] ?? `#${id}`);
    await model.delete({ where: { [spec.pk]: id } });
    await this.activity.log(`PURGE ${spec.type} #${id} (${name})`, meta);
    return { removed: name };
  }

  private spec(type: string): EntitySpec {
    const found = SPECS.find((s) => s.type === type);
    if (!found) throw new BadRequestException(`Unknown trash type "${type}".`);
    return found;
  }
}
