import { Clock, MapPin } from 'lucide-react';
import type { CalendarEvent } from './eventTypes';

interface EventCardProps {
  event: CalendarEvent;
  location?: string;
}

export default function EventCard({ event, location }: EventCardProps) {
  return (
    <article className="events-card">
      <div className="events-card-date">
        <span className="events-card-day">{event.day}</span>
        <span className="events-card-month">{event.month}</span>
      </div>
      <div className="events-card-body">
        <span className={`status-badge outline tag-${event.tag.toLowerCase()}`}>{event.tag}</span>
        <h3 className="events-card-title">{event.title}</h3>
        {event.desc && <p className="events-card-desc">{event.desc}</p>}
        <div className="events-card-meta">
          {event.time && (
            <span className="events-card-meta-item">
              <Clock size={13} /> {event.time}
            </span>
          )}
          <span className="events-card-meta-item">
            <MapPin size={13} /> {location ?? event.location}
          </span>
        </div>
      </div>
    </article>
  );
}
