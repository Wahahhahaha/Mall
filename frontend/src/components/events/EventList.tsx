import type { ReactNode } from 'react';
import type { CalendarEvent } from './eventTypes';
import EventCard from './EventCard';

interface EventListProps {
  events: CalendarEvent[];
  title: string;
  charging?: string | ReactNode;
  emptyText?: string;
  onCardClick?: (event: CalendarEvent) => void;
}

export default function EventList({
  events,
  title,
  charging,
  emptyText = 'No events scheduled for this month.',
  onCardClick,
}: EventListProps) {
  return (
    <>
      <div className="events-month-head">
        <h2 className="landing-section-title">{title}</h2>
        {charging !== undefined && (
          <span className="section-head-note">{charging}</span>
        )}
      </div>
      {events.length === 0 ? (
        <p className="landing-empty">{emptyText}</p>
      ) : (
        <div className="events-list">
          {events.map((ev, i) => {
            const card = <EventCard event={ev} />;
            return (
              <div key={ev.id ?? `${ev.title}-${i}`} className="events-list-item">
                {onCardClick ? (
                  <button
                    type="button"
                    className="events-list-link"
                    onClick={() => onCardClick(ev)}
                  >
                    {card}
                  </button>
                ) : (
                  card
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
