import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SettingsService } from './settings.service';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const WEEKDAYS_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

/**
 * Mirrors the public /locations page. The mall admin has no editor for these yet
 * (the `setting` table only stores name/logo/contact/address), so this stays the
 * single server-side copy used to ground the assistant's answers.
 */
const OPENING_HOURS = {
  weekday: '10.00 - 22.00',
  weekend: '09.00 - 22.30',
  holiday: '09.00 - 22.30',
} as const;

const MAX_EVENTS_IN_CONTEXT = 25;
const MAX_TENANTS_IN_CONTEXT = 40;

interface EventWindow {
  from: Date;
  to: Date;
  label: string;
}

function monthWindow(year: number, month: number): EventWindow {
  return {
    from: new Date(year, month, 1, 0, 0, 0, 0),
    to: new Date(year, month + 1, 0, 23, 59, 59, 999),
    label: `${MONTHS_EN[month]} ${year}`,
  };
}

function dayWindow(date: Date): EventWindow {
  return {
    from: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    ),
    to: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    ),
    label: `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`,
  };
}

function addMonths(base: Date, delta: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

/**
 * Figures out which period the user is asking about ("bulan ini", "Agustus",
 * "hari ini") so the event query can be scoped instead of dumping the table.
 * Returns null when the question is not about events at all.
 */
export function resolveEventWindow(
  text: string,
  now: Date,
): EventWindow | null {
  const t = text.toLowerCase();

  const wantsToday =
    /\b(hari ini|today|now|sekarang|saat ini|sedang berlangsung|berlangsung|active|upcoming|segera)\b/.test(
      t,
    );
  if (wantsToday) return dayWindow(now);

  if (/\b(bulan depan|next month|besok bulan)\b/.test(t)) {
    const next = addMonths(now, 1);
    return monthWindow(next.getFullYear(), next.getMonth());
  }
  if (/\b(bulan lalu|last month|bulan sebelumnya)\b/.test(t)) {
    const prev = addMonths(now, -1);
    return monthWindow(prev.getFullYear(), prev.getMonth());
  }
  if (/\b(bulan ini|this month|bulan sekarang)\b/.test(t)) {
    return monthWindow(now.getFullYear(), now.getMonth());
  }

  // Explicit month name, e.g. "agustus" or "agustus 2026". Built from the
  // lowercased month so the match survives the lowercased haystack.
  for (let i = 0; i < MONTHS_ID.length; i++) {
    const name = MONTHS_ID[i].toLowerCase();
    if (!new RegExp(`\\b${name}\\b`).test(t)) continue;
    const yearMatch = t.match(/\b(20\d{2})\b/);
    let year = now.getFullYear();
    if (yearMatch) {
      year = Number(yearMatch[1]);
    } else {
      // A month already past this year most likely means next year's edition.
      if (i < now.getMonth()) year += 1;
    }
    return monthWindow(year, i);
  }

  const yearMatch = t.match(/\b(20\d{2})\b/);
  if (yearMatch) return monthWindow(Number(yearMatch[1]), now.getMonth());

  // Event question without a period mentioned: assume the current month.
  return monthWindow(now.getFullYear(), now.getMonth());
}

// Indonesian glues suffixes onto nouns ("liburnya", "acaranya", "bukaannya"),
// so the trailing boundary is dropped on purpose; a leading one is still kept
// so short roots do not fire inside unrelated words.
export function isEventQuestion(text: string): boolean {
  return /\b(event|acara|kegiatan|agenda|pameran|exhibition|konser|concert|musik|music|festival|pertunjukan|perform|workshop|promo|diskon|bazar|bazaar|spiel|ulang tahun)/i.test(
    text,
  );
}

export function isOperationalQuestion(text: string): boolean {
  return /\b(buka|tutup|jam|operasional|open|clos(e|ing)|hours?|hari kerja|weekend|akhir pekan|libur|holiday|alamat|address|lokasi|location|par[kk]ir)/i.test(
    text,
  );
}

function utcDate(value: Date): Date {
  // Prisma round-trips `timestamp` columns verbatim, so the UTC parts are the
  // calendar date the admin typed. Reading UTC keeps this in step with the
  // frontend, which parses the raw ISO string without timezone shifting.
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function fmtDate(value: Date): string {
  const d = utcDate(value);
  return `${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtTime(value: Date): string {
  const iso = value.toISOString();
  const t = iso.slice(11, 16);
  return t === '00:00' ? '' : t;
}

@Injectable()
export class ChatService {
  private readonly model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async send(messages: ChatCompletionMessage[]): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured on the server.',
      );
    }
    if (!messages || messages.length === 0) {
      throw new BadRequestException('Messages are required.');
    }

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const question = lastUser?.content ?? '';

    const systemPrompt = await this.buildSystemPrompt(question);

    const body = {
      model: this.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
    };

    let res: Response;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ServiceUnavailableException('Unable to reach the Groq API.');
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 429) {
        throw new ServiceUnavailableException(
          'AI service is busy. Please try again shortly.',
        );
      }
      throw new ServiceUnavailableException(
        `AI service error (${res.status}): ${text}`,
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableException(
        'AI service returned an empty response.',
      );
    }
    return content;
  }

  private async buildSystemPrompt(question: string): Promise<string> {
    const now = new Date();
    const custom = process.env.CHAT_SYSTEM_PROMPT?.trim();

    const identity = custom
      ? custom
      : [
          'You are Cher, the AI assistant for the Mall Management Information System.',
          'Answer questions only about the mall: its tenants, facilities, parking, opening hours, directions, events, and promotions.',
          'If a question is unrelated to the mall, politely redirect the user back to mall topics.',
          'Be concise, friendly, and respond in the same language as the user (Indonesian if the user writes in Indonesian).',
        ].join(' ');

    const parts = [identity, '', this.clockBlock(now), await this.mallBlock()];

    if (isOperationalQuestion(question)) {
      parts.push('', this.hoursBlock());
    }

    if (isEventQuestion(question)) {
      const window =
        resolveEventWindow(question, now) ??
        monthWindow(now.getFullYear(), now.getMonth());
      parts.push('', await this.eventBlock(window));
    }

    if (
      /\b(tenant|tenantnya|store|toko|shop|merek|brand|kategori|category|lantai|floor)\b/i.test(
        question,
      )
    ) {
      parts.push('', await this.tenantBlock(question));
    }

    parts.push(
      '',
      [
        'DATA RULES:',
        '- The DATABASE SNAPSHOT below is the only source of truth for events, tenants, floors, and operating hours. Never invent, estimate, or recall events or tenants that are not listed there.',
        '- If the snapshot has no data for what was asked, say plainly that the data is not available in the system instead of guessing.',
        '- List every item that matches; do not truncate without saying how many were left out.',
      ].join('\n'),
    );

    return parts.join('\n');
  }

  private clockBlock(now: Date): string {
    return [
      'CURRENT DATE AND TIME (server time — always resolve relative dates like "this month" against this):',
      `Today is ${WEEKDAYS_ID[now.getDay()]}, ${now.getDate()} ${MONTHS_EN[now.getMonth()]} ${now.getFullYear()}.`,
    ].join('\n');
  }

  private async mallBlock(): Promise<string> {
    let name = 'SIM MALL';
    let address: string | null = null;
    let contact: string | null = null;
    try {
      const s = await this.settings.getAll();
      name = s.systemName || name;
      address = s.systemAddress;
      contact = s.systemContact;
    } catch {
      // Settings are best-effort: a failure here must not break the chat.
    }

    const lines = [
      'MALL FACTS (authoritative):',
      `- Name: ${name}`,
      `- Address: ${address || 'not configured in the system'}`,
      `- Contact: ${contact || 'not configured in the system'}`,
    ];
    return lines.join('\n');
  }

  private hoursBlock(): string {
    return [
      'OPENING HOURS (these three schedules are the only ones that exist — do not invent others):',
      `- Monday to Friday: ${OPENING_HOURS.weekday}`,
      `- Saturday and Sunday: ${OPENING_HOURS.weekend}`,
      `- National holidays: ${OPENING_HOURS.holiday}`,
      '',
      'HOLIDAY RULES (you decide which dates are holidays from your own knowledge of the Indonesian public holiday calendar):',
      '- When the user names a date, work out its day of week first.',
      '- If that date is an Indonesian national holiday (e.g. 17 August Independence Day, Nyepi, Eid al-Fitr, Eid al-Adha, Christmas, New Year, Good Friday, Ascension, etc.), use the National Holidays schedule and name the holiday.',
      '- National holidays that follow the Islamic calendar (Idulfitri, Idula Adha) can differ from the Gregorian date by one day depending on the year — resolve them carefully for the specific year and say which year you assumed.',
      '- If the year is ambiguous, assume the next occurrence that has not passed yet, and state that assumption in the answer.',
      '- Always answer with: the resolved date, its day of week, whether it is a holiday, and the matching opening hours.',
      '- If the user asks about a stretch of dates, report the schedule for each distinct day type in that range rather than one blended answer.',
    ].join('\n');
  }

  private async eventBlock(window: EventWindow): Promise<string> {
    try {
      const rows = await this.prisma.event.findMany({
        where: {
          isDeleted: false,
          startDate: { lte: window.to },
          endDate: { gte: window.from },
        },
        include: { floor: true },
        orderBy: { startDate: 'asc' },
        take: MAX_EVENTS_IN_CONTEXT,
      });

      // Compare calendar days in the same frame the dates are stored in, so a
      // "running today" flag never drifts by a day because of the server offset.
      const today = utcDate(new Date());
      const running = rows.filter(
        (e) => utcDate(e.startDate) <= today && utcDate(e.endDate) >= today,
      );

      const head = `DATABASE SNAPSHOT — events overlapping ${window.label}:`;
      if (rows.length === 0) {
        return [
          head,
          'No events are stored in the system for that period.',
          'Tell the user there are no scheduled events then, and offer to check another month.',
        ].join('\n');
      }

      const lines = rows.map((e, i) => {
        const where =
          [e.location, e.floor?.floorname].filter(Boolean).join(' / ') ||
          'location not set';
        const time = fmtTime(e.startDate);
        const parts = [
          `${i + 1}. "${e.name}"`,
          `dates: ${fmtDate(e.startDate)} to ${fmtDate(e.endDate)}`,
          time ? `starts ${time}` : null,
          `where: ${where}`,
        ].filter(Boolean);
        const desc = (e.description ?? '').trim();
        if (desc) parts.push(`about: ${desc}`);
        if (running.some((r) => r.eventid === e.eventid))
          parts.push('STATUS: running right now');
        return parts.join(' | ');
      });

      return [
        head,
        `${rows.length} event${rows.length === 1 ? '' : 's'} found; ${running.length} of them running today.`,
        ...lines,
        'Report these faithfully: the name, the date range, the location, and whether it is still running.',
      ].join('\n');
    } catch {
      return 'DATABASE SNAPSHOT — events: temporarily unavailable, do not answer event questions right now.';
    }
  }

  private async tenantBlock(question: string): Promise<string> {
    try {
      const t = question.toLowerCase();
      const floorName = MONTHS_ID.find(
        (m) =>
          t.includes(`lantai ${m.toLowerCase()}`) ||
          t.includes(`${m.toLowerCase()} floor`),
      );
      const category = question
        .match(/\bkategori\s+([\w\s-]{3,40})/i)?.[1]
        ?.trim();

      const rows = await this.prisma.tenant.findMany({
        where: { isDeleted: false },
        include: { location: { include: { floor: true } } },
        orderBy: { name: 'asc' },
        take: MAX_TENANTS_IN_CONTEXT,
      });

      const total = await this.prisma.tenant.count({
        where: { isDeleted: false },
      });
      const byFloor = new Map<string, number>();
      for (const t2 of rows) {
        const f = t2.location?.floor?.floorname ?? 'unassigned';
        byFloor.set(f, (byFloor.get(f) ?? 0) + 1);
      }

      const scope = floorName
        ? `tenants on ${floorName}`
        : category
          ? `tenants in category ${category}`
          : 'tenants in the system';

      const filtered = rows
        .filter((t2) => {
          if (floorName) {
            const f = t2.location?.floor?.floorname?.toLowerCase() ?? '';
            return f.includes(floorName.toLowerCase());
          }
          if (category)
            return t2.category.toLowerCase().includes(category.toLowerCase());
          return true;
        })
        .map((t2) => {
          const unit = t2.location?.name ?? 'no unit';
          const floor = t2.location?.floor?.floorname ?? 'unassigned floor';
          return `- ${t2.name} | category: ${t2.category} | unit: ${unit} | floor: ${floor}`;
        });

      return [
        `DATABASE SNAPSHOT — ${scope}:`,
        `${total} active tenant${total === 1 ? '' : 's'} stored in total.`,
        `Floors represented: ${Array.from(byFloor.entries())
          .map(([f, n]) => `${f} (${n})`)
          .join(', ')}.`,
        ...(filtered.length ? filtered : ['- no tenant matches that filter']),
        `Listed: ${filtered.length} of ${total}. If the list was cut off, say so.`,
      ].join('\n');
    } catch {
      return 'DATABASE SNAPSHOT — tenants: temporarily unavailable, do not answer tenant questions right now.';
    }
  }
}
