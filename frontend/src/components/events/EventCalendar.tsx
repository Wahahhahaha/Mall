import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from './eventTypes';
import { WEEKDAYS, startOfDay, monthLabel, filterMonth } from './eventTypes';

interface EventCalendarProps {
  events: CalendarEvent[];
  initialDate?: Date;
  onMonthChange?: (cursor: Date) => void;
}

export default function EventCalendar({
  events,
  initialDate,
  onMonthChange,
}: EventCalendarProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => initialDate ?? new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const currentYear = cursor.getFullYear();
  const currentMonth = cursor.getMonth();
  const isCurrentMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  const monthEvents = useMemo(
    () => filterMonth(events, currentYear, currentMonth),
    [events, currentYear, currentMonth]
  );

  const cells = useMemo(() => {
    const first = new Date(currentYear, currentMonth, 1);
    const start = startOfDay(first);
    start.setDate(start.getDate() - start.getDay());
    const out: ({ day: number; inMonth: boolean; events: CalendarEvent[] } | null)[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dayEvents = monthEvents.filter((ev) => Number(ev.day) === date.getDate());
      out.push({
        day: date.getDate(),
        inMonth: date.getMonth() === currentMonth,
        events: dayEvents,
      });
    }
    return out;
  }, [currentYear, currentMonth, monthEvents]);

  function shiftMonth(step: number) {
    setCursor((c) => {
      const next = new Date(c.getFullYear(), c.getMonth() + step, 1);
      onMonthChange?.(next);
      return next;
    });
  }

  function goToToday() {
    const next = new Date(today.getFullYear(), today.getMonth(), 1);
    setCursor(next);
    onMonthChange?.(next);
  }

  return (
    <div className="events-calendar-card">
      <div className="events-cal-header">
        <button type="button" className="events-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <div className="events-cal-title">
          <h2>{monthLabel(cursor)}</h2>
          {!isCurrentMonth && (
            <button type="button" className="events-today-btn" onClick={goToToday}>
              Today
            </button>
          )}
        </div>
        <button type="button" className="events-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="events-cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="events-cal-weekday">{w}</div>
        ))}
        {cells.map((cell, i) =>
          cell ? (
            <div
              key={i}
              className={`events-cal-cell ${cell.inMonth ? '' : 'muted'} ${
                cell.day === today.getDate() &&
                cell.inMonth &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear()
                  ? 'is-today'
                  : ''
              }`}
            >
              <span className="events-cal-day">{cell.day}</span>
              {cell.events.length > 0 && (
                <div className="events-cal-markers">
                  {cell.events.map((ev) => (
                    <span
                      key={ev.id ?? `${ev.title}-${ev.day}`}
                      className={`events-cal-dot tag-${ev.tag.toLowerCase()}`}
                      title={ev.title}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div key={i} className="events-cal-cell empty" />
          )
        )}
      </div>
    </div>
  );
}
