import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Calendar,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Images,
  Layers3,
  Loader2,
  MapPin,
  Maximize2,
  X,
} from 'lucide-react';
import { BACKEND_URL } from '../../../config';

interface EventDetail {
  eventid: number;
  name: string;
  description: string | null;
  floorid: number | null;
  floor?: { floorid: number; floorname: string; floorcode?: string | null } | null;
  location: string;
  startDate: string;
  endDate: string;
  posters: string[];
}

interface EventLoadResult {
  requestId: string;
  event: EventDetail | null;
  error: string;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export default function EventDetailView() {
  const { id } = useParams<{ id: string }>();
  const requestId = id && /^\d+$/.test(id) ? id : null;
  const [result, setResult] = useState<EventLoadResult | null>(null);

  useEffect(() => {
    let ignore = false;

    if (!requestId) {
      return () => {
        ignore = true;
      };
    }

    axios
      .get<EventDetail>(`${BACKEND_URL}/events/${requestId}`)
      .then((res) => {
        if (ignore) return;
        setResult({ requestId, event: res.data, error: '' });
      })
      .catch((err) => {
        if (ignore) return;
        setResult({
          requestId,
          event: null,
          error:
            axios.isAxiosError(err) && err.response?.status === 404
              ? 'Event not found.'
              : 'Failed to load event details.',
        });
      });

    return () => {
      ignore = true;
    };
  }, [requestId]);

  const isCurrentResult = result?.requestId === requestId;
  const event = isCurrentResult ? result.event : null;
  const error = !requestId
    ? 'Invalid event ID.'
    : isCurrentResult
      ? result.error
      : '';
  const loading = Boolean(requestId && !isCurrentResult);
  const posters = Array.isArray(event?.posters) ? event.posters : [];

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxOpen = lightboxIndex !== null;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const stepLightbox = useCallback(
    (direction: 1 | -1) => {
      setLightboxIndex((current) => {
        if (current === null || posters.length === 0) return current;
        return (current + direction + posters.length) % posters.length;
      });
    },
    [posters.length]
  );

  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepLightbox(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepLightbox(-1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, stepLightbox, closeLightbox]);

  return (
    <div className="simulator-panel event-detail-panel">
      <div className="data-page-header">
        <div>
          <Link to="/dashboard/event-data" className="event-detail-back">
            <ArrowLeft size={15} /> Back to Event Data
          </Link>
          <h2 className="welcome-title">
            <Calendar size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Event Details
          </h2>
          <p className="welcome-text">Review the complete information for this event.</p>
        </div>
      </div>

      {loading ? (
        <div className="event-detail-state" aria-live="polite">
          <Loader2 size={22} className="spinner" />
          <span>Loading event details...</span>
        </div>
      ) : error ? (
        <div className="event-detail-state" role="alert">
          <CalendarX size={24} />
          <span>{error}</span>
        </div>
      ) : event ? (
        <article className="event-detail-card">
          <header className="event-detail-hero">
            <div className="event-detail-heading">
              <h3 className="event-detail-title">
                <span className="event-detail-title-text">{event.name}</span>
                <span className="event-detail-chip">
                  <MapPin size={13} />
                  {event.location}
                </span>
              </h3>
            </div>
          </header>

          <div className="event-detail-facts">
            <div className="event-detail-fact">
              <Clock3 size={17} />
              <div>
                <span>Start Date</span>
                <strong>{formatDate(event.startDate)}</strong>
              </div>
            </div>
            <div className="event-detail-fact">
              <Calendar size={17} />
              <div>
                <span>End Date</span>
                <strong>{formatDate(event.endDate)}</strong>
              </div>
            </div>
            <div className="event-detail-fact">
              <Layers3 size={17} />
              <div>
                <span>Floor</span>
                <strong>{event.floor?.floorname || 'All Floors / Atrium'}</strong>
              </div>
            </div>
            <div className="event-detail-fact">
              <MapPin size={17} />
              <div>
                <span>Location</span>
                <strong>{event.location}</strong>
              </div>
            </div>
          </div>

          <section className="event-detail-section">
            <h4>
              <FileText size={16} /> Description
            </h4>
            <p className={event.description ? '' : 'event-detail-empty'}>
              {event.description || 'No description has been added for this event.'}
            </p>
          </section>

          <section className="event-detail-section">
            <h4>
              <Images size={16} /> Promo Posters
            </h4>
            {posters.length > 0 ? (
              <div className="event-detail-posters">
                {posters.map((poster, index) => (
                  <button
                    key={`${poster}-${index}`}
                    type="button"
                    className="event-poster-thumb"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Open ${event.name} poster ${index + 1} full screen`}
                  >
                    <img src={poster} alt={`${event.name} poster ${index + 1}`} />
                    <span className="event-poster-zoom" aria-hidden="true">
                      <Maximize2 size={14} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="event-detail-empty">No promo posters have been added.</p>
            )}
          </section>
        </article>
      ) : null}

      {lightboxOpen && lightboxIndex !== null && event && (
        <div
          className="poster-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${event.name} promo posters`}
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="poster-lightbox-btn close"
            onClick={closeLightbox}
            aria-label="Close posters"
          >
            <X size={20} />
          </button>

          {posters.length > 1 && (
            <>
              <button
                type="button"
                className="poster-lightbox-btn prev"
                onClick={(e) => {
                  e.stopPropagation();
                  stepLightbox(-1);
                }}
                aria-label="Previous poster"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                className="poster-lightbox-btn next"
                onClick={(e) => {
                  e.stopPropagation();
                  stepLightbox(1);
                }}
                aria-label="Next poster"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          <figure className="poster-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img src={posters[lightboxIndex]} alt={`${event.name} poster ${lightboxIndex + 1}`} />
            <figcaption>
              Poster {lightboxIndex + 1} of {posters.length}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
