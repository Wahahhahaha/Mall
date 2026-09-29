import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { FLOOR_UNITS, resolvePlanFloor, tenants } from '../../../landing/mallData';
import type { FloorUnit } from '../../../landing/mallData';
import { routeToUnit } from './graphData';

const W = 460;
const H = 340;

const shortName = (name: string) => (name.length > 16 ? `${name.slice(0, 15)}…` : name);

interface Poi {
  x: number;
  y: number;
  glyph: string;
  label: string;
  anchor?: 'start' | 'end' | 'middle';
  lx?: number;
  exit?: boolean;
}

const GROUND_POIS: Poi[] = [
  { x: 208, y: 172, glyph: '/', label: '' },
  { x: 256, y: 186, glyph: '/', label: '' },
  { x: 316, y: 118, glyph: '/', label: 'ESCALATOR', anchor: 'end', lx: 304 },
  { x: 178, y: 164, glyph: 'S', label: '' },
  { x: 148, y: 122, glyph: 'L', label: 'LIFT', lx: 160 },
  { x: 330, y: 86, glyph: 'L', label: 'LIFT', anchor: 'end', lx: 318 },
  { x: 34, y: 200, glyph: 'W', label: 'TOILET', lx: 46 },
  { x: 416, y: 178, glyph: 'W', label: 'TOILET', anchor: 'end', lx: 404 },
  { x: 292, y: 148, glyph: 'P', label: 'PRAYER ROOM', anchor: 'end', lx: 280 },
  { x: 268, y: 196, glyph: '$', label: 'ATM', lx: 280 },
  { x: 244, y: 148, glyph: 'i', label: '' },
  { x: 40, y: 120, glyph: '↗', label: 'EMERGENCY EXIT', lx: 52, exit: true },
  { x: 422, y: 252, glyph: '↗', label: 'EMERGENCY EXIT', anchor: 'end', lx: 410, exit: true },
  { x: 388, y: 252, glyph: 'P', label: '', anchor: 'end', lx: 376 },
];

const UPPER_POIS: Poi[] = [
  { x: 33, y: 210, glyph: 'W', label: 'TOILET' },
  { x: 427, y: 120, glyph: 'W', label: 'TOILET', anchor: 'end', lx: 405 },
];

function PoiLayer({ list, floor }: { list: Poi[]; floor: string }) {
  return (
    <g>
      {list.map((p, i) => (
        <g key={`${floor}-poi-${i}`} className="arch-poi">
          {p.exit ? (
            <path
              className="arch-poi-glyph"
              d={`M${p.x - 5} ${p.y + 4} L${p.x + 5} ${p.y - 4} M${p.x - 1} ${p.y - 4} L${p.x + 5} ${p.y - 4} M${p.x + 5} ${p.y - 4} L${p.x + 5} ${p.y + 2}`}
            />
          ) : (
            <>
              <circle className="arch-poi-dot" cx={p.x} cy={p.y} r={8} />
              <text className="arch-poi-gl" x={p.x} y={p.y + 2.8} textAnchor="middle">
                {p.glyph}
              </text>
            </>
          )}
          {p.label ? (
            <text className="arch-poi-label" x={p.lx ?? p.x + 12} y={p.y + 3} textAnchor={p.anchor ?? 'start'}>
              {p.label}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

function FloorPlan({ plan }: { plan: string }) {
  const units: FloorUnit[] = FLOOR_UNITS[plan] ?? [];
  const known = new Set(tenants.map((t) => t.unit));
  const vacant = units.filter((u) => !u.name && !known.has(u.code));
  const isGround = plan === 'Ground Floor';

  return (
    <>
      <rect className="arch-land" x={0} y={0} width={W} height={H} />
      {isGround ? (
        <>
          {GROUND_EXTRA}
          {vacant.map((u) => (
            <rect key={`v-${u.code}`} className="arch-vacant" x={u.x} y={u.y} width={u.w} height={u.h} rx={2} />
          ))}
        </>
      ) : (
        <>
          {UPPER_EXTRA}
          {vacant.map((u) => (
            <rect key={`v-${u.code}`} className="arch-vacant" x={u.x} y={u.y} width={u.w} height={u.h} rx={2} />
          ))}
        </>
      )}
      <PoiLayer list={isGround ? GROUND_POIS : UPPER_POIS} floor={plan} />
    </>
  );
}

const GROUND_EXTRA = [
  <path key="landscape1" className="arch-landzone" d="M-10 332 L470 332 L470 320 C320 312 140 320 -10 326 Z" />,
  <ellipse key="la1" className="arch-landzone" cx={60} cy={42} rx={34} ry={14} />,
  <ellipse key="la2" className="arch-landzone" cx={428} cy={306} rx={26} ry={12} />,
  <path key="road1-case" className="arch-road-case" d="M-10 316 C 100 306 200 322 300 314 S 420 306 470 312" />,
  <path key="road1" className="arch-road" d="M-10 316 C 100 306 200 322 300 314 S 420 306 470 312" />,
  <path key="road2-case" className="arch-road-case" d="M444 150 C 452 200 446 250 452 300" />,
  <path key="road2" className="arch-road" d="M444 150 C 452 200 446 250 452 300" />,
  <text key="roadlab" className="arch-street" x={96} y={330} transform="rotate(-2 96 330)">
    Jl. Bunga Mawar
  </text>,
  <path
    key="shell"
    className="arch-shell"
    d="M40 292 L38 150 Q38 110 62 92 L110 74 Q160 62 230 64 L268 62 Q296 58 322 48 L372 34 Q400 28 432 26 L438 28 Q442 40 440 70 L436 112 Q434 140 428 170 L420 220 Q414 252 396 268 L340 280 Q300 284 262 284 L250 284 Q230 276 208 284 L150 282 Q100 284 66 290 Z"
  />,
  <ellipse key="atrium" className="arch-atrium" cx={230} cy={180} rx={72} ry={24} />,
  <ellipse key="atrium-inner" className="arch-atrium-inner" cx={230} cy={180} rx={58} ry={17} />,
  <rect key="parking" className="arch-parking" x={332} y={210} width={114} height={88} rx={6} />,
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => (
    <g key={`slot-${i}`}>
      <line className="arch-slot" x1={344 + i * 14} y1={266} x2={344 + i * 14} y2={296} />
      <line className="arch-slot" x1={351 + i * 14} y1={214} x2={351 + i * 14} y2={240} />
    </g>
  )),
  <text key="plab" className="arch-zonelabel" x={389} y={252} textAnchor="middle">
    CAR PARK
  </text>,
  <text key="psub" className="arch-zonesub" x={389} y={263} textAnchor="middle">
    41 LOTS
  </text>,
  <rect key="motor" className="arch-motor" x={14} y={256} width={26} height={44} rx={4} />,
  <text key="motorlab" className="arch-poi-label" x={27} y={310} textAnchor="middle">
    MOTOR
  </text>,
  <g key="do1" className="arch-drop">
    <circle cx={230} cy={306} r={9} />
    <text x={230} y={310} textAnchor="middle" className="arch-drop-gl">
      D
    </text>
    <text className="arch-poi-label" x={230} y={295} textAnchor="middle">
      DROP-OFF
    </text>
  </g>,
  <g key="do2" className="arch-drop">
    <circle cx={440} cy={136} r={7} />
    <text x={440} y={140} textAnchor="middle" className="arch-drop-gl">
      D
    </text>
    <text className="arch-poi-label" x={430} y={123} textAnchor="end">
      DROP-OFF
    </text>
  </g>,
  <text key="roadlab2" className="arch-street" x={459} y={240} transform="rotate(-90 459 240)" textAnchor="middle">
    Jl. Pembangunan
  </text>,
  <g key="stage" className="arch-stage">
    <rect x={206} y={196} width={48} height={26} rx={4} />
    <text x={230} y={212} textAnchor="middle">
      STAGE
    </text>
  </g>,
  <text key="cclab" className="arch-arealabel" x={230} y={128} textAnchor="middle">
    CENTER COURT
  </text>,
];

const UPPER_EXTRA = [
  <rect key="landscape" className="arch-landzone" x={22} y={22} width={40} height={34} rx={6} />,
  <line key="c1-case" className="arch-road-case" x1={10} y1={166} x2={450} y2={166} />,
  <line key="c1" className="arch-road" x1={10} y1={166} x2={450} y2={166} />,
  <line key="c2-case" className="arch-road-case" x1={150} y1={16} x2={150} y2={324} />,
  <line key="c2" className="arch-road" x1={150} y1={16} x2={150} y2={324} />,
  <line key="c3-case" className="arch-road-case" x1={310} y1={16} x2={310} y2={324} />,
  <line key="c3" className="arch-road" x1={310} y1={16} x2={310} y2={324} />,
  <rect key="plaza" className="arch-plaza" x={168} y={288} width={124} height={40} rx={6} />,
  <g key="eventarea" className="arch-eventarea">
    <rect x={196} y={146} width={68} height={40} rx={4} />
    <text x={230} y={170} textAnchor="middle">
      EVENT AREA
    </text>
  </g>,
  <text key="cclab" className="arch-arealabel" x={230} y={44} textAnchor="middle">
    CENTER COURT
  </text>,
  ...[120, 340].map((x) => (
    <g key={`esc-${x}`} className="arch-escalator">
      <rect x={x - 14} y={159} width={28} height={14} rx={3} />
      <path d={`M${x - 9} 170 L${x + 2} 162 M${x + 2} 170 L${x + 9} 165`} />
    </g>
  )),
  <text className="arch-entrance" x={230} y={331} textAnchor="middle">
    MAIN ENTRANCE
  </text>,
];

interface PathpalIndoorMapProps {
  floor: string;
  activeUnit: string;
  onSelectUnit: (unit: string) => void;
  showUserDot?: boolean;
  userPos?: { x: number; y: number } | null;
  carPos?: { x: number; y: number } | null;
  followPos?: { x: number; y: number } | null;
  heading?: number;
}

export function PathpalIndoorMap({
  floor,
  activeUnit,
  onSelectUnit,
  showUserDot,
  userPos,
  carPos,
  followPos,
}: PathpalIndoorMapProps) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // `floor` comes from the floors table ("1 Floor", "Lower Ground"), which is not a
  // FLOOR_UNITS key. Resolving once keeps the drawn plan, the routing grid and the
  // label in agreement and stops the unknown-floor crash.
  const plan = resolvePlanFloor(floor);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, [floor]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(6, Math.max(1, s * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const targetUnit = activeUnit ? (FLOOR_UNITS[plan] ?? []).find((u) => u.code === activeUnit) : null;

  const startPt = (showUserDot && userPos) || followPos || { x: 230, y: 304 };
  const start = { x: startPt.x, y: startPt.y };

  const drawnRoute: { x: number; y: number }[] = (() => {
    if (!targetUnit || !activeUnit) return [];
    return routeToUnit(plan, start, targetUnit);
  })();

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const zoomBy = (factor: number) => {
    setScale((s) => Math.min(6, Math.max(1, s * factor)));
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.isPrimary && e.pointerType === 'touch') return;
    movedRef.current = false;
    dragRef.current = { x: e.clientX - tx, y: e.clientY - ty };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    const nextX = e.clientX - dragRef.current.x;
    const nextY = e.clientY - dragRef.current.y;
    if (Math.abs(nextX - tx) + Math.abs(nextY - ty) > 3) movedRef.current = true;
    setTx(nextX);
    setTy(nextY);
  };

  const endDrag = () => {
    dragRef.current = null;
    pinchRef.current = null;
    window.setTimeout(() => {
      movedRef.current = false;
    }, 0);
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches;
    if (t.length === 2) {
      pinchRef.current = {
        dist: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY),
        scale,
      };
    }
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    const t = e.touches;
    if (t.length === 2 && pinchRef.current) {
      const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      const next = Math.min(6, Math.max(1, pinchRef.current.scale * (dist / pinchRef.current.dist)));
      setScale(next);
    }
  };

  const polyline = drawnRoute.map((p) => `${(p.x).toFixed(1)},${(p.y).toFixed(1)}`).join(' ');

  const units = (FLOOR_UNITS[plan] ?? [])
    .map((u) => {
      const tenant = tenants.find((t) => t.unit === u.code);
      const name = u.name ?? tenant?.name;
      if (!name && !activeUnit) return null;
      const active = u.code === activeUnit;
      return (
        <g
          key={u.code}
          className={`arch-unit${active ? ' active' : ''}`}
          onClick={() => {
            if (!movedRef.current) onSelectUnit(u.code);
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectUnit(u.code);
            }
          }}
        >
          <rect
            x={u.x}
            y={u.y}
            width={u.w}
            height={u.h}
            rx={2}
            transform={u.rot ? `rotate(${u.rot} ${u.x + u.w / 2} ${u.y + u.h / 2})` : undefined}
          />
          {(name || active) && (
            <>
              <text className="arch-unit-code" x={u.x + u.w / 2} y={u.y + u.h / 2 - 1} textAnchor="middle">
                {u.code}
              </text>
              {name && (
                <text className="arch-unit-name" x={u.x + u.w / 2} y={u.y + u.h / 2 + 9} textAnchor="middle">
                  {shortName(name)}
                </text>
              )}
            </>
          )}
        </g>
      );
    })
    .filter(Boolean);

  return (
    <div className="pathpal-map" style={{ touchAction: 'none' }}>
      <div className="pathpal-canvas">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="pathpal-svg"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            cursor: dragRef.current ? 'grabbing' : 'grab',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={endDrag}
        >
          <FloorPlan plan={plan} />

          {polyline && (
            <>
              <polyline className="pathpal-route-casing" points={polyline} />
              <polyline className="pathpal-route" points={polyline} />
            </>
          )}

          {carPos && (
            <g className="pathpal-pin" transform={`translate(${carPos.x} ${carPos.y})`}>
              <circle r={10} />
              <text y={3} textAnchor="middle" className="pathpal-pin-label">
                P
              </text>
            </g>
          )}

          {showUserDot && (
            <g className="pathpal-user" transform={`translate(${startPt.x} ${startPt.y})`}>
              <circle className="mall-map-userdot-pulse" r={10} />
              <circle className="mall-map-userdot" r={6} />
            </g>
          )}

          <g>{units}</g>

          <text className="arch-plan-tag" x={W - 10} y={H - 6} textAnchor="end">
            {floor.toUpperCase()} · SCALE 1:500
          </text>
        </svg>
      </div>

      <div className="pathpal-controls" aria-label="Map controls">
        <button type="button" className="map-ctrl" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
          <Plus size={15} />
        </button>
        <button type="button" className="map-ctrl" onClick={() => zoomBy(0.8)} aria-label="Zoom out">
          <Minus size={15} />
        </button>
        <button type="button" className="map-ctrl" onClick={reset} aria-label="Reset view">
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}

export default PathpalIndoorMap;
