import { useEffect, useState, useSyncExternalStore } from 'react';
import { getAppSettings, subscribeAppSettings } from '../../components/appSettingsBus';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../../config';
import Reveal from '../../components/Reveal';
import {
  SectionHeading,
  StatsRow,
  FloorMap,
  FaqSection,
  FacilityPill,
  type FloorInfo,
} from '../../components/landing';
import { floors, facilities, marqueeItems, events, faqs } from './mallData';
import heroImg from '../../assets/mall-hero.jpg';

const DEFAULT_FLOOR_COUNT = floors.length;

function heroStats(floorCount: number) {
  return [
    { value: 148, suffix: '+', label: 'Retail Tenants' },
    { value: 1500, label: 'Parking Spaces' },
    { value: floorCount, label: 'Shopping Floors' },
    { value: '24/7', label: 'System Uptime' },
  ];
}

function HeroSection({ appName, floorCount }: { appName: string; floorCount: number }) {
  return (
    <section className="home-hero">
      <div className="hero-media">
        <img
          src={heroImg}
          alt="SIM Mall interior"
          className="hero-photo"
          fetchPriority="high"
        />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-fade" aria-hidden="true" />
      </div>

      <div className="hero-inner">
        <h1 className="hero-title">
          Explore every corner of <em>{appName}</em>.
        </h1>
        <p className="hero-sub">
          Find your favorite stores and every facility in the building — before you
          arrive at the mall.
        </p>

        <div className="hero-actions">
          <Link to="/tenant-directory" className="btn btn-primary-landing btn-lg">
            Explore <ArrowRight size={16} />
          </Link>
          <Link to="/facilities" className="btn btn-ghost-landing btn-lg">
            Mall Facilities
          </Link>
        </div>

        <StatsRow items={heroStats(floorCount)} variant="hero" />
      </div>
    </section>
  );
}

function AboutSection({ appName }: { appName: string }) {
  return (
    <section className="landing-section">
      <div className="about-split">
        <Reveal stagger className="about-split-copy">
          <h2 className="landing-section-title">More than just a place to shop.</h2>
          <p className="about-text">
            Since it first opened, {appName} has been a meeting place for the
            community — where families spend their weekends, businesses grow, and
            the city moves faster.
          </p>
          <p className="about-text">
            Managed with an integrated information system, every floor, tenant, and
            facility is carefully recorded for a seamless visiting experience.
          </p>
          <ul className="about-points">
            {[
              '148 local & international tenants',
              'Backed by 24/7 CCTV security',
              'Disability-friendly throughout all areas',
              '1,500 parking spaces with tap-in system',
            ].map((point) => (
              <li key={point}>
                <Check size={15} /> {point}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120} className="about-split-visual">
          <img
            src={heroImg}
            alt="SIM Mall interior"
            className="about-img"
            loading="lazy"
          />
          <span className="about-img-caption">Main Atrium &middot; Ground Floor</span>
        </Reveal>
      </div>
    </section>
  );
}

function TickerStrip() {
  return (
    <div className="marquee-strip" aria-hidden="true">
      <div className="marquee-track">
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <span key={`${item}-${i}`} className="marquee-item">{item}</span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);
  const [liftFloors, setLiftFloors] = useState<FloorInfo[]>(floors);
  const [floorCount, setFloorCount] = useState(DEFAULT_FLOOR_COUNT);

  useEffect(() => {
    let ignore = false;

    const loadAndSortFloors = () => {
      Promise.all([
        axios.get(`${BACKEND_URL}/floors`),
        axios.get(`${BACKEND_URL}/tenants`),
      ])
        .then(([floorRes, tenantRes]) => {
          if (ignore) return;
          const floorRows = floorRes.data as Array<{
            floorid: number;
            floorname: string;
            floorcode: string | null;
            _count?: { locations: number };
          }>;
          const tenantRows = tenantRes.data as Array<{
            name: string;
            location?: { floorid: number | null } | null;
          }>;
          if (!floorRows.length) return;

          setFloorCount(floorRows.length);

          // Floors come pre-sorted by the API (sortOrder from DB), so no
          // localStorage re-sort is needed — the order set on /dashboard/floor-data
          // is persisted server-side and applied here automatically.

          const byFloor = new Map<number, string[]>();
          for (const t of tenantRows) {
            const id = t.location?.floorid;
            if (id == null) continue;
            const arr = byFloor.get(id) ?? [];
            arr.push(t.name);
            byFloor.set(id, arr);
          }
          const built: FloorInfo[] = floorRows.map((fl) => {
            const items = (byFloor.get(fl.floorid) ?? []).slice(0, 6);
            return {
              key: fl.floorcode ?? fl.floorname,
              name: fl.floorname,
              desc: items.length
                ? `${items.length} tenants to explore on this floor.`
                : `${fl._count?.locations ?? 0} locations on this floor.`,
              items,
            };
          });
          setLiftFloors(built);
        })
        .catch(() => {
          // keep the static fallback if the server is unreachable
        });
    };

    loadAndSortFloors();

    const handleOrderChange = () => {
      loadAndSortFloors();
    };
    window.addEventListener('floorOrderChanged', handleOrderChange);

    return () => {
      ignore = true;
      window.removeEventListener('floorOrderChanged', handleOrderChange);
    };
  }, []);

  return (
    <>
      <HeroSection appName={brand.appName} floorCount={floorCount} />

      <div id="tour">
        <TickerStrip />
        <Reveal stagger>
          <StatsRow items={heroStats(floorCount)} variant="landing" />
        </Reveal>
      </div>

      <AboutSection appName={brand.appName} />

      <section className="landing-section landing-section-tight">
        <Reveal>
          <FloorMap floors={liftFloors} />
        </Reveal>
      </section>

      <section id="events" className="landing-section">
        <SectionHeading
          title="Upcoming Events"
          action={
            <Link to="/events" className="section-head-link">
              View calendar <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="event-grid">
          {events.map((ev, i) => (
            <Reveal key={ev.title} delay={i * 80}>
              <article className="event-card">
                <div className="event-date">
                  <span className="event-day">{ev.day}</span>
                  <span className="event-month">{ev.month}</span>
                </div>
                <div className="event-body">
                  <span className="status-badge outline">{ev.tag}</span>
                  <h3 className="event-title">{ev.title}</h3>
                  <p className="event-desc">{ev.desc}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-tight">
        <SectionHeading
          title="Supporting Facilities"
          action={
            <Link to="/facilities" className="section-head-link">
              All facilities <ArrowRight size={14} />
            </Link>
          }
        />
        <Reveal stagger className="facility-pillrow">
          {facilities.slice(0, 6).map((f) => (
            <FacilityPill key={f.name} facility={f} to="/facilities" />
          ))}
        </Reveal>
      </section>

      <section className="landing-section landing-section-tight">
        <FaqSection faqs={faqs} title="Frequently Asked Questions" />
      </section>
    </>
  );
}
