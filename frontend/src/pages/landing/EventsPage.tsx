import { useEffect, useMemo, useState } from 'react';
import Reveal from '../../components/Reveal';
import { EventCalendar, EventList, MONTH_ABBR, monthLabel } from '../../components/events';
import type { CalendarEvent } from '../../components/events';
import { BACKEND_URL } from '../../config';

interface DbEvent {
  eventid: number;
  name: string;
  description?: string | null;
  floorid?: number | null;
  floor?: { floorid: number; floorname: string; floorcode?: string | null } | null;
  location?: string | null;
  startDate: string;
  endDate: string;
}

const TAG_RULES: [string, RegExp][] = [
  ['Music', /music|musik|live|acoustic|jazz|band|concert|performasi/i],
  ['Exhibition', /pameran|exhibition|expo|art|iklan|showcase|fair|bazaar/i],
  ['Kids', /kids|children|anak|family|fest\b|fun/i],
  ['Promo', /promo|discount|diskon|sale|offer|voucher|member/i],
];

function tagFor(name: string): string {
  for (const [tag, re] of TAG_RULES) {
    if (re.test(name)) return tag;
  }
  return 'Event';
}

/** Parse tanggal tanpa konversi timezone: nilai DB disimpan sebagai tanggal polos. */
function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function timeLabel(iso: string): string {
  const t = iso.slice(11, 16);
  return !t || t === '00:00' ? '' : t;
}

/** Menghasilkan penanda tanggal harian untuk grid kalender dari database. */
function toCalendarEvents(rows: DbEvent[]): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  for (const row of rows) {
    if (!row?.startDate || !row.name) continue;

    const start = parseIsoDate(row.startDate);
    const end = parseIsoDate(row.endDate ?? row.startDate);
    const time = timeLabel(row.startDate);
    const tag = tagFor(row.name);
    const where = [row.location, row.floor?.floorname].filter(Boolean).join(' · ');

    const span = Math.min(
      Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
      62
    );

    for (let i = 0; i < span; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      out.push({
        id: `${row.eventid}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
        day: String(d.getDate()).padStart(2, '0'),
        month: MONTH_ABBR[d.getMonth()],
        year: d.getFullYear(),
        time,
        tag,
        title: row.name,
        desc: row.description ?? '',
        location: where || undefined,
      });
    }
  }

  return out.sort((a, b) =>
    a.year === b.year
      ? MONTH_ABBR.indexOf(a.month) === MONTH_ABBR.indexOf(b.month)
        ? Number(a.day) - Number(b.day)
        : MONTH_ABBR.indexOf(a.month) - MONTH_ABBR.indexOf(b.month)
      : a.year - b.year
  );
}

export default function EventsPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dbRows, setDbRows] = useState<DbEvent[] | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let ignore = false;

    fetch(`${BACKEND_URL}/events`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((rows: DbEvent[]) => {
        if (ignore) return;
        setDbRows(Array.isArray(rows) ? rows : []);
        setOffline(false);
      })
      .catch(() => {
        if (!ignore) {
          setOffline(true);
          setDbRows([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const calendarEvents = useMemo(
    () => toCalendarEvents(dbRows ?? []),
    [dbRows]
  );
  const live = !offline && dbRows !== null;

  const eventsInMonth = useMemo(() => {
    if (!dbRows || dbRows.length === 0) {
      return [];
    }

    const cursorYear = cursor.getFullYear();
    const cursorMonth = cursor.getMonth();
    const startOfMonth = new Date(cursorYear, cursorMonth, 1);
    const endOfMonth = new Date(cursorYear, cursorMonth + 1, 0, 23, 59, 59);

    return dbRows
      .filter((row) => {
        if (!row?.startDate || !row.name) return false;
        const start = parseIsoDate(row.startDate);
        const end = parseIsoDate(row.endDate ?? row.startDate);
        return start <= endOfMonth && end >= startOfMonth;
      })
      .map((row) => {
        const start = parseIsoDate(row.startDate);
        const time = timeLabel(row.startDate);
        const tag = tagFor(row.name);
        const where = [row.location, row.floor?.floorname].filter(Boolean).join(' · ');
        return {
          id: `db-event-${row.eventid}`,
          day: String(start.getDate()).padStart(2, '0'),
          month: MONTH_ABBR[start.getMonth()],
          year: start.getFullYear(),
          time,
          tag,
          title: row.name,
          desc: row.description ?? '',
          location: where || undefined,
        };
      });
  }, [dbRows, cursor]);

  return (
    <section className="landing-section">
      <Reveal stagger>
        <h1 className="landing-section-title">Events Calendar</h1>
        <p className="landing-section-sub">
          Exhibitions, festivals, live music, and promos across the mall this month.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <EventCalendar events={calendarEvents} initialDate={cursor} onMonthChange={setCursor} />
      </Reveal>

      <Reveal delay={120}>
        <EventList
          events={eventsInMonth}
          title={`Events in ${monthLabel(cursor)}`}
          charging={
            live
              ? `${eventsInMonth.length} event${eventsInMonth.length === 1 ? '' : 's'} scheduled`
              : offline
                ? 'Server backend offline \u2014 silakan jalankan backend server'
                : 'Syncing schedule\u2026'
          }
        />
      </Reveal>
    </section>
  );
}
