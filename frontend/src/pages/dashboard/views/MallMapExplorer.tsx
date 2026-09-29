import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, ChevronUp, LocateFixed, MapPin, Navigation } from 'lucide-react';
import { toast } from '../../../components/toastBus';
import PathpalIndoorMap from './pathpal/PathpalIndoorMap';
import {
  CATEGORY_ORDER,
  computeRoute,
  computeRouteToPoint,
  FLOORS_ORDER,
  MALL_LOCATION,
  openDirections,
  projectToMap,
  tenants,
} from '../../landing/mallData';
import type { RouteResult } from '../../landing/mallData';

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface SvgPoint {
  x: number;
  y: number;
}

interface CarSpot {
  pos: SvgPoint;
  floor: string;
}

interface SimState {
  active: boolean;
  pos: SvgPoint;
  heading: number;
  remaining: number;
}

type LocateStatus = 'idle' | 'locating' | 'ok' | 'denied';

interface MallMapExplorerProps {
  initialUnit?: string;
  onUnitChange?: (unit: string | undefined) => void;
}

const shortFloor = (f: string) => (f === 'Ground Floor' ? 'GF' : f.replace('Floor ', ''));

const ENTRANCE: SvgPoint = { x: 230, y: 304 };
const PX_PER_M = 1 / 0.35;
const SPEED_PXPS = 1.35 * PX_PER_M;

// Test anchor near the adidas / Skechers / Crocs sports row (Ground Floor).
const TEST_LOCATION: UserLocation = { lat: 1.1359355, lng: 104.0062661, accuracy: 3 };
// Walkable spot in the aisle/storefront in front of the sports row on the SVG.
const TEST_SVG_POS: SvgPoint = { x: 200, y: 205 };

function MallMapExplorer({ initialUnit, onUnitChange }: MallMapExplorerProps) {
  const initialTenant = initialUnit ? tenants.find((t) => t.unit === initialUnit) : undefined;

  const [activeUnit, setActiveUnit] = useState(initialTenant?.unit ?? '');
  const [floor, setFloor] = useState(initialTenant?.floor ?? FLOORS_ORDER[0]);
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('idle');
  const [car, setCar] = useState<CarSpot | null>(null);
  const [carPrompt, setCarPrompt] = useState(false);
  const [navTarget, setNavTarget] = useState<'unit' | 'car' | null>(null);
  const [sim, setSim] = useState<SimState | null>(null);
  const [arrived, setArrived] = useState(false);
  const [testPos, setTestPos] = useState<SvgPoint | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const gotFirstFixRef = useRef(false);
  const animRef = useRef<number | null>(null);

  const handleFix = useCallback((pos: GeolocationPosition) => {
    setUserLoc({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
    setLocateStatus('ok');
    if (!gotFirstFixRef.current) {
      gotFirstFixRef.current = true;
      toast('Your location has been detected');
    }
  }, []);

  const handleError = useCallback(() => {
    setLocateStatus('denied');
    toast('Location access denied — live dot disabled');
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) return undefined;
    const timer = window.setTimeout(() => {
      setLocateStatus('locating');
      watchIdRef.current = navigator.geolocation.watchPosition(handleFix, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [handleFix, handleError]);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocateStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(handleFix, handleError, {
      enableHighAccuracy: true,
      timeout: 8000,
    });
  };

  const setTestLocation = () => {
    setUserLoc({ ...TEST_LOCATION });
    setLocateStatus('ok');
    setTestPos(TEST_SVG_POS);
    toast('Test location set at sports row (adidas)');
  };

  const selectUnit = (unit: string) => {
    const tenant = tenants.find((t) => t.unit === unit);
    if (!tenant) return;
    setActiveUnit(unit);
    setNavTarget('unit');
    setSim(null);
    setArrived(false);
    setFloor(tenant.floor);
    onUnitChange?.(unit);
  };

  const changeFloor = (next: string) => {
    setFloor(next);
    if (navTarget === 'unit' && activeUnit) {
      const tenant = tenants.find((t) => t.unit === activeUnit);
      if (tenant && tenant.floor !== next) {
        setActiveUnit('');
        setNavTarget(null);
        onUnitChange?.(undefined);
      }
    }
  };

  const stepFloor = (dir: -1 | 1) => {
    const idx = FLOORS_ORDER.indexOf(floor);
    const next = FLOORS_ORDER[idx + dir];
    if (next) changeFloor(next);
  };

  const handleExit = () => {
    setActiveUnit('');
    setNavTarget(null);
    setSim(null);
    setArrived(false);
    onUnitChange?.(undefined);
  };

  const livePos: SvgPoint | null =
    locateStatus === 'ok' && userLoc ? projectToMap(userLoc.lat, userLoc.lng) : null;
  const startPos: SvgPoint = sim?.pos ?? testPos ?? livePos ?? ENTRANCE;
  const activeTenant = tenants.find((t) => t.unit === activeUnit) ?? null;

  const route: RouteResult | null = (() => {
    if (navTarget === 'car' && car && car.floor === floor) {
      const r = computeRouteToPoint(startPos, car.pos);
      return { ...r, turn: 'ahead' as const, targetName: 'My Car' };
    }
    if (navTarget === 'unit' && activeTenant && activeTenant.floor === floor) {
      return computeRoute(floor, activeUnit, startPos);
    }
    return null;
  })();

  const startNav = () => {
    if (!route) return;
    const a = route.points[0];
    const b = route.points[1] ?? a;
    const heading = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    setSim({ active: true, pos: a, heading, remaining: route.meters });
  };

  const stopNav = () => setSim((s) => (s ? { ...s, active: false } : s));

  useEffect(() => {
    if (!sim?.active || !route) return undefined;
    const pts = route.points;
    let total = 0;
    const segLens: number[] = [];
    for (let i = 1; i < pts.length; i += 1) {
      const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      segLens.push(l);
      total += l;
    }
    const startTs = performance.now();
    const step = (ts: number) => {
      const dist = Math.min(total, ((ts - startTs) / 1000) * SPEED_PXPS);
      let acc = 0;
      let i = 0;
      while (i < segLens.length - 1 && acc + segLens[i] < dist) {
        acc += segLens[i];
        i += 1;
      }
      const segT = segLens[i] > 0 ? (dist - acc) / segLens[i] : 1;
      const a = pts[i];
      const b = pts[i + 1];
      const pos = { x: a.x + (b.x - a.x) * segT, y: a.y + (b.y - a.y) * segT };
      const heading = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const remaining = Math.round((total - dist) * (1 / PX_PER_M));
      if (dist >= total) {
        setSim({ active: false, pos: pts[pts.length - 1], heading, remaining: 0 });
        setArrived(true);
        toast('You have arrived to your destination');
        return;
      }
      setSim({ active: true, pos, heading, remaining });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [sim?.active, route]);

  const saveCar = () => {
    setCar({ pos: livePos ?? ENTRANCE, floor });
    setCarPrompt(false);
    toast('Parking position saved');
  };

  const routeToCar = () => {
    if (!car) return;
    if (car.floor !== floor) changeFloor(car.floor);
    setActiveUnit('');
    setNavTarget('car');
    setSim(null);
    setArrived(false);
  };

  const turnText =
    route && (route.turn === 'ahead' ? `Walk ahead to ${route.targetName}` : `Turn ${route.turn} to ${route.targetName}`);

  const directory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: tenants.filter((t) => t.floor === floor && t.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="location-bar">
        <button type="button" className="btn-minimap" onClick={requestLocation}>
          <LocateFixed size={13} />
          {locateStatus === 'locating' ? ' Locating…' : ' My Location'}
        </button>
        <button type="button" className="btn-minimap car" onClick={() => (car ? routeToCar() : setCarPrompt(true))}>
          <MapPin size={13} /> {car ? 'Route to My Car' : 'Set My Car'}
        </button>
        <button type="button" className="btn-minimap" onClick={setTestLocation}>
          <LocateFixed size={13} /> Set Test Location
        </button>
        <span className={`location-status ${locateStatus}`}>
          {locateStatus === 'ok' && userLoc && (
            <>
              Live: {userLoc.lat.toFixed(5)}, {userLoc.lng.toFixed(5)} (±
              {Math.round(userLoc.accuracy)} m)
            </>
          )}
          {locateStatus === 'idle' && 'Allow location access to show your position.'}
          {locateStatus === 'locating' && 'Requesting GPS signal…'}
          {locateStatus === 'denied' && 'Location unavailable — navigation uses simulated start.'}
        </span>
      </div>

      <div className="indoor-map-frame">
        {route && (
          <div className={`map-banner ${sim?.active ? 'nav' : ''}`}>
            <ArrowUp size={26} strokeWidth={2.5} className="map-banner-arrow" />
            <div className="map-banner-text">
              <strong>
                {sim?.active
                  ? `${sim.remaining} m remaining`
                  : `${route.meters} meters`}
              </strong>
              <span>{turnText}</span>
            </div>
            {sim?.active ? (
              <button type="button" className="map-stop-btn" onClick={stopNav}>
                Stop
              </button>
            ) : (
              <button type="button" className="map-start-btn" onClick={startNav}>
                Start
              </button>
            )}
          </div>
        )}

        <PathpalIndoorMap
          floor={floor}
          activeUnit={activeUnit}
          onSelectUnit={selectUnit}
          showUserDot={locateStatus === 'ok' || Boolean(sim)}
          userPos={sim?.pos ?? testPos ?? livePos ?? undefined}
          followPos={sim?.active ? sim.pos : null}
          heading={sim?.heading ?? 0}
          carPos={car && car.floor === floor ? car.pos : null}
        />

        <div className="map-floorrail" aria-label="Floor selector">
          <button
            type="button"
            className="map-floorrail-btn"
            onClick={() => stepFloor(1)}
            disabled={floor === FLOORS_ORDER[FLOORS_ORDER.length - 1]}
            aria-label="Floor up"
          >
            <ChevronUp size={15} />
          </button>
          <span className="map-floorrail-label">{shortFloor(floor)}</span>
          <button
            type="button"
            className="map-floorrail-btn"
            onClick={() => stepFloor(-1)}
            disabled={floor === FLOORS_ORDER[0]}
            aria-label="Floor down"
          >
            <ChevronDown size={15} />
          </button>
        </div>

        <div className="map-bottombar">
          <div className="map-bottombar-info">
            <strong>{route ? `${route.minutes} min, ${route.meters} m` : 'Select a store'}</strong>
            <span>{activeTenant || navTarget === 'car' ? `To ${route?.targetName ?? 'destination'}` : 'Tap any highlighted unit'}</span>
          </div>
          {(activeTenant || navTarget === 'car') && (
            <button type="button" className="map-exit-btn" onClick={handleExit}>
              Exit
            </button>
          )}
        </div>

        {arrived && (
          <div className="map-arrival">
            <span className="map-arrival-check">&#10003;</span>
            <p>You have arrived to your destination</p>
            <button type="button" onClick={() => { setArrived(false); handleExit(); }}>
              Close
            </button>
          </div>
        )}

        {carPrompt && (
          <div className="map-carprompt">
            <p>
              <MapPin size={14} /> Confirm vehicle position at your current position?
            </p>
            <div>
              <button type="button" className="ghost" onClick={() => setCarPrompt(false)}>
                Ignore
              </button>
              <button type="button" onClick={saveCar}>
                Save Position
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="minimap-meta">
        <span className="status-badge outline">{floor}</span>
        {(activeTenant || navTarget === 'car') && (
          <span className="status-badge solid">To {route?.targetName}</span>
        )}
        <span className="minimap-address">
          <MapPin size={13} /> {MALL_LOCATION.address}
        </span>
        {activeTenant?.geo && (
          <span className="minimap-address geo">
            <Navigation size={13} /> {activeTenant.geo.lat.toFixed(6)}, {activeTenant.geo.lng.toFixed(6)}
            {activeTenant.geo.alt != null ? ` · ${activeTenant.geo.alt}m a.s.l` : ''}
          </span>
        )}
      </div>

      <div className="minimap-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={!activeTenant}
          onClick={() =>
            activeTenant &&
            openDirections(activeTenant, userLoc ? `${userLoc.lat},${userLoc.lng}` : undefined)
          }
        >
          <Navigation size={14} /> Navigate Externally
        </button>
      </div>

      <div className="map-directory">
        {directory.map((g) => (
          <div key={g.cat} className="map-directory-col">
            <h4>{g.cat}</h4>
            {g.items.map((t) => (
              <button key={t.unit} type="button" onClick={() => selectUnit(t.unit)}>
                <b>{t.unit}</b> {t.name}
              </button>
            ))}
          </div>
        ))}
      </div>
      <small className="form-hint">
        Tap a unit to set a destination, then press Start — the blue dot walks the route like a live navigation session.
      </small>
    </>
  );
}

export default MallMapExplorer;
