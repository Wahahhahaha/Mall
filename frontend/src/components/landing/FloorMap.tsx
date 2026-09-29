import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export interface FloorInfo {
  key: string;
  name: string;
  desc: string;
  items: string[];
}

interface FloorMapProps {
  floors: FloorInfo[];
  directoryLink?: string;
  defaultKey?: string;
}

type Phase = 'open' | 'closing' | 'opening';

const CLOSE_MS = 450;
const OPEN_MS = 560;

export default function FloorMap({
  floors,
  directoryLink = '/tenant-directory',
  defaultKey,
}: FloorMapProps) {
  const [active, setActive] = useState(defaultKey ?? floors[0]?.key ?? '');
  const [phase, setPhase] = useState<Phase>('open');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const floor = floors.find((f) => f.key === active) ?? floors[0];

  useEffect(() => {
    const timersRef = timers.current;
    return () => timersRef.forEach(clearTimeout);
  }, []);

  const selectFloor = (key: string) => {
    if (key === active) return;
    if (phase !== 'open') return;
    setPhase('closing');
    timers.current.push(
      setTimeout(() => {
        setActive(key);
        setPhase('opening');
      }, CLOSE_MS)
    );
    timers.current.push(
      setTimeout(() => setPhase('open'), CLOSE_MS + OPEN_MS)
    );
  };

  return (
    <div className="liftmap">
      <div className="lift-panel">
        <span className="lift-panel-label">Floor</span>
        <div className="lift-buttons">
          {[...floors].reverse().map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={active === f.key}
              className={`lift-button ${active === f.key ? 'active' : ''}`}
              onClick={() => selectFloor(f.key)}
            >
              <span className="lift-button-key">{f.key}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`lift-car phase-${phase} ${phase !== 'open' ? 'doors-active' : ''}`}>
        <div className="lift-doors" aria-hidden="true">
          <span className="lift-door lift-door-left" />
          <span className="lift-door lift-door-right" />
        </div>

        <div className="lift-car-content">
          <div className="lift-display">
            <span className="lift-floor-readout">{floor?.key}</span>
          </div>
          <span className="floormap-desc">{floor?.desc}</span>
          <h3 className="floormap-title">{floor?.name}</h3>
          <div className="floormap-list">
            {(floor?.items ?? []).map((item) => (
              <span key={item} className="floormap-tag">{item}</span>
            ))}
          </div>
          <Link to={directoryLink} className="landing-nav-card-go floormap-go">
            Full directory <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
