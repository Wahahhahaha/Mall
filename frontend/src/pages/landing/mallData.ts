import {
  UtensilsCrossed,
  Baby,
  Moon,
  Wifi,
  CreditCard,
  Droplets,
  ArrowUpDown,
  Car,
} from 'lucide-react';
import { getAppSettings } from '../../components/appSettingsBus';
import type { LucideIcon } from 'lucide-react';

export interface TenantItem {
  unit: string;
  name: string;
  category: string;
  floor: string;
  geo?: { lat: number; lng: number; alt?: number; label?: string };
}

export const tenants: TenantItem[] = [
  {
    unit: 'HM-01',
    name: 'H&M',
    category: 'Fashion',
    floor: 'Ground Floor',
    geo: {
      lat: 1.1361477,
      lng: 104.0061258,
      alt: 8,
      label: 'N 1°8\'10.13172" · E 104°0\'22.05288" · 8m a.s.l',
    },
  },
  { unit: 'A01', name: 'Miniso', category: 'Fashion', floor: 'Ground Floor' },
  { unit: 'A02', name: 'Sneaker Zone', category: 'Fashion', floor: 'Ground Floor' },
  { unit: 'A03', name: 'Watch Studio', category: 'Fashion', floor: 'Ground Floor' },
  { unit: 'A04', name: 'iBox', category: 'Electronics', floor: 'Ground Floor' },
  { unit: 'A05', name: 'Erafone', category: 'Electronics', floor: 'Ground Floor' },
  { unit: 'A06', name: 'Optik Seis', category: 'Beauty', floor: 'Ground Floor' },
  { unit: 'A07', name: 'The Perfume Shop', category: 'Beauty', floor: 'Ground Floor' },
  { unit: 'A08', name: "Victoria's Secret", category: 'Beauty', floor: 'Ground Floor' },
  { unit: 'A09', name: 'Bath & Body Works', category: 'Beauty', floor: 'Ground Floor' },
  {
    unit: 'A10',
    name: 'adidas',
    category: 'Sports',
    floor: 'Ground Floor',
    geo: {
      lat: 1.1359355,
      lng: 104.0062661,
      alt: 9,
      label: 'N 1°8\'9.3678" · E 104°0\'22.55796" · 9m a.s.l',
    },
  },
  {
    unit: 'A11',
    name: 'Skechers',
    category: 'Sports',
    floor: 'Ground Floor',
    geo: {
      lat: 1.1359355,
      lng: 104.0062661,
      alt: 9,
      label: 'N 1°8\'9.3678" · E 104°0\'22.55796" · 9m a.s.l',
    },
  },
  { unit: 'A12', name: 'Fila Kids', category: 'Sports', floor: 'Ground Floor' },
  {
    unit: 'A15',
    name: 'Crocs',
    category: 'Sports',
    floor: 'Ground Floor',
    geo: {
      lat: 1.1359642,
      lng: 104.0063315,
      alt: 9,
      label: 'N 1°8\'9.47112" · E 104°0\'22.7934" · 9m a.s.l',
    },
  },
  { unit: 'A13', name: 'Mothercare', category: 'Fashion', floor: 'Ground Floor' },
  { unit: 'A14', name: 'Sugar Life', category: 'F&B', floor: 'Ground Floor' },
  { unit: 'B01', name: 'Steve Madden', category: 'Fashion', floor: 'Ground Floor' },
  { unit: 'B02', name: 'PUMA', category: 'Sports', floor: 'Ground Floor' },
  { unit: 'B03', name: 'FILA', category: 'Sports', floor: 'Ground Floor' },
  { unit: 'B04', name: 'UNIQLO', category: 'Fashion', floor: 'Ground Floor' },
  { unit: 'B05', name: 'UNIQLO Home', category: 'Fashion', floor: 'Ground Floor' },
  { unit: 'B06', name: 'POINTBREAK', category: 'F&B', floor: 'Ground Floor' },
  { unit: 'C01', name: 'Palace', category: 'F&B', floor: 'Ground Floor' },
  { unit: 'C02', name: 'Kopi Kenangan', category: 'F&B', floor: 'Ground Floor' },
  { unit: 'C03', name: 'LC Sign', category: 'Services', floor: 'Ground Floor' },
  { unit: 'C05', name: 'MOKKA', category: 'F&B', floor: 'Ground Floor' },
  { unit: 'C06', name: 'Gengki Sushi', category: 'F&B', floor: 'Ground Floor' },
  { unit: 'C07', name: 'Pizza e Birra', category: 'F&B', floor: 'Ground Floor' },
  { unit: 'C08', name: 'Starbucks', category: 'F&B', floor: 'Ground Floor' },
  { unit: 'C09', name: 'Nature Republic', category: 'Beauty', floor: 'Ground Floor' },
  { unit: 'L1-02', name: 'Zara', category: 'Fashion', floor: 'Floor 1' },
  { unit: 'L1-08', name: 'Gramedia', category: 'Books', floor: 'Floor 1' },
  { unit: 'L1-12', name: 'Guardian', category: 'Beauty', floor: 'Floor 1' },
  { unit: 'L2-05', name: 'Cinema XXI', category: 'Entertainment', floor: 'Floor 2' },
  { unit: 'L2-08', name: 'IKEA Pick-up Point', category: 'Furniture', floor: 'Floor 2' },
  { unit: 'L3-01', name: 'Timezone', category: 'Entertainment', floor: 'Floor 3' },
];

export interface FacilityItem {
  icon: LucideIcon;
  name: string;
  desc: string;
  location: string;
}

export const facilities: FacilityItem[] = [
  { icon: Car, name: 'Parking Area', desc: '1,500 outdoor and basement parking spaces with 24/7 security.', location: 'Gate A & Gate B' },
  { icon: Wifi, name: 'Free Wi-Fi', desc: 'High-speed wireless internet covering every corner of the mall.', location: 'All floors' },
  { icon: Droplets, name: 'Prayer Rooms', desc: 'Clean and comfortable musala for visitors, separate for men and women.', location: 'Every floor' },
  { icon: Baby, name: 'Nursing Room', desc: 'Private nursing and diaper-changing facilities for families.', location: 'Floor 1 & Floor 3' },
  { icon: UtensilsCrossed, name: 'Food Terrace', desc: 'Dozens of F&B tenants, from local favorites to international brands.', location: 'Ground Floor & Floor 2' },
  { icon: Moon, name: 'Kids Playground', desc: 'Safe play area to keep your little ones entertained.', location: 'Floor 3' },
  { icon: CreditCard, name: 'ATM Center', desc: 'Bank ATMs and cash payment points in one convenient zone.', location: 'Ground Floor' },
  { icon: ArrowUpDown, name: 'Escalator & Lift', desc: 'Easy access to every floor, including wheelchair-friendly lifts.', location: 'All floors' },
];

export interface FloorInfo {
  key: string;
  name: string;
  desc: string;
  items: string[];
}

export const floors: FloorInfo[] = [
  {
    key: 'B1',
    name: 'Basement 1',
    desc: 'Secure parking and a quick fresh-grocery stop.',
    items: ['Parking', 'Fresh Market'],
  },
  {
    key: 'GF',
    name: 'Ground Floor',
    desc: 'Fashion anchors, beauty, and your favorite coffee stops.',
    items: ['H&M', 'UNIQLO', 'Starbucks', 'Miniso', 'adidas', 'Kopi Kenangan'],
  },
  {
    key: 'L1',
    name: 'Floor 1',
    desc: 'International fashion brands and the latest reading corner.',
    items: ['Zara', 'Gramedia', 'Guardian'],
  },
  {
    key: 'L2',
    name: 'Floor 2',
    desc: 'Entertainment, cinema, and home living pick-up point.',
    items: ['Cinema XXI', 'IKEA Pick-up Point'],
  },
  {
    key: 'L3',
    name: 'Floor 3',
    desc: 'Family entertainment center for the weekend.',
    items: ['Timezone'],
  },
];

export const marqueeItems: string[] = [
  'MIDNIGHT SALE EVERY FRIDAY',
  'FREE PARKING 1ST HOUR',
  'NEW TENANTS: UNIQLO HOME',
  'MEMBER GET MEMBER',
  'WEEKEND LIVE MUSIC AT THE STAGE',
  'FOLLOW @SIMMALL.ID',
];

export interface EventItem {
  day: string;
  month: string;
  year: number;
  time: string;
  tag: string;
  title: string;
  desc: string;
  location: string;
}

const currentYear = 2026;

export const events: EventItem[] = [
  { day: '04', month: 'SEP', year: currentYear, time: '10:00', tag: 'Promo', title: 'Member Get Member', desc: 'Double points for members on all purchases at participating tenants.', location: 'All Stores' },
  { day: '05', month: 'SEP', year: currentYear, time: '09:00', tag: 'Promo', title: 'Payday Sale', desc: 'Up to 50% off at selected fashion and F&B tenants all day.', location: 'Fashion & F&B Tenants' },
  { day: '06', month: 'SEP', year: currentYear, time: '19:00', tag: 'Music', title: 'Weekend Live Music', desc: 'Acoustic sessions at the Main Stage, Ground Floor atrium.', location: 'Main Stage, GF' },
  { day: '10', month: 'SEP', year: currentYear, time: '11:00', tag: 'Exhibition', title: 'Art & Craft Fair', desc: 'Local artists showcase handmade works at Center Court.', location: 'Center Court, GF' },
  { day: '12', month: 'SEP', year: currentYear, time: '10:00', tag: 'Kids', title: 'Kids Fun Fest', desc: 'Games, mascots, and workshops at the Floor 3 playground.', location: 'Playground, Floor 3' },
  { day: '13', month: 'SEP', year: currentYear, time: '18:30', tag: 'Music', title: 'Jazz Night', desc: 'Live smooth jazz by the waterfront dining terrace.', location: 'Dining Terrace, Floor 2' },
  { day: '17', month: 'SEP', year: currentYear, time: '12:00', tag: 'Exhibition', title: 'Local Craft Market', desc: '50+ local brands at Center Court, all weekend long.', location: 'Center Court, GF' },
  { day: '20', month: 'SEP', year: currentYear, time: '14:00', tag: 'Kids', title: 'Baby Fair', desc: 'Diapers, toys, and parenting talks with big discounts.', location: 'Event Hall, Floor 1' },
  { day: '24', month: 'SEP', year: currentYear, time: '19:00', tag: 'Music', title: 'Sunday Serenade', desc: 'Choir and orchestra performance in the grand lobby.', location: 'Grand Lobby, GF' },
  { day: '27', month: 'SEP', year: currentYear, time: '10:00', tag: 'Exhibition', title: 'Food Festival', desc: 'Culinary booths and live cooking from our F&B tenants.', location: 'Food Terrace, Floor 4' },
  { day: '30', month: 'SEP', year: currentYear, time: '20:00', tag: 'Promo', title: 'Flash Sale Night', desc: 'Secret midnight deals announced before the event closes.', location: 'All Stores' },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const faqs: FaqItem[] = [
  { q: 'What are the mall opening hours?', a: 'The mall operates every day from 10:00 to 22:00. F&B tenants in the Food Terrace may open longer.' },
  { q: 'Is parking free?', a: 'The first hour is free for all visitors. Members enjoy two extra free hours per day.' },
  { q: 'Do you provide wheelchairs?', a: 'Yes, wheelchairs are available at the Information Desk on the Ground Floor, free of charge.' },
  { q: 'Are pets allowed?', a: 'Pets are welcome in common areas as long as they are in a carrier or stroller.' },
  { q: 'How do I join as a tenant?', a: 'Reach out through the leasing contact on the Settings page or visit our Tenant Lounge.' },
];

export interface OpeningHour {
  day: string;
  time: string;
}

export const openingHours: OpeningHour[] = [
  { day: 'Monday – Friday', time: '10.00 – 22.00' },
  { day: 'Saturday – Sunday', time: '09.00 – 22.30' },
  { day: 'National Holidays', time: '09.00 – 22.30' },
];

export const MALL_LOCATION = {
  lat: -6.16475,
  lng: 106.90834,
  address: 'Jl. Boulevard Raya No. 45, Kelapa Gading, Jakarta Utara',
};

export const MALL_GEO_BOUNDS = {
  minLat: -6.166,
  maxLat: -6.1635,
  minLng: 106.9071,
  maxLng: 106.9096,
};

export function projectToMap(lat: number, lng: number): { x: number; y: number } {
  const nx = Math.min(
    1,
    Math.max(0, (lng - MALL_GEO_BOUNDS.minLng) / (MALL_GEO_BOUNDS.maxLng - MALL_GEO_BOUNDS.minLng))
  );
  const ny = Math.min(
    1,
    Math.max(0, (lat - MALL_GEO_BOUNDS.minLat) / (MALL_GEO_BOUNDS.maxLat - MALL_GEO_BOUNDS.minLat))
  );
  return { x: 24 + nx * 412, y: 144 + ny * 44 };
}

export const FLOORS_ORDER = ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3'];

/* The plan geometry in FLOOR_UNITS is keyed by FLOORS_ORDER, but the floors table
   names its rows its own way ("1 Floor", "L1", "Lower Ground"). Anything that
   feeds a database floorname into the map must go through here first, otherwise
   FLOOR_UNITS[floor] is undefined and the map throws. */
const GROUND_ALIASES = new Set([
  'ground',
  'ground floor',
  'gf',
  'lobby',
  'terrace',
  'lower ground',
  'lower ground floor',
  'basement',
  'basement 1',
  'b1',
  'lg',
]);

const UPPER_FLOOR_PATTERN = /^(?:floor|l|lv|level)?\s*-?\s*(\d+)\s*(?:f|fl|floor|lv|level)?$/;

export function resolvePlanFloor(rawName: string | null | undefined): string {
  const name = (rawName ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!name) return FLOORS_ORDER[0];
  if (GROUND_ALIASES.has(name)) return 'Ground Floor';

  const exact = FLOORS_ORDER.find((key) => key.toLowerCase() === name);
  if (exact) return exact;

  // "1 Floor", "floor 1", "L1", "1F" ... -> the plan whose name carries that level.
  const level = UPPER_FLOOR_PATTERN.exec(name)?.[1];
  if (level) {
    const plan = FLOORS_ORDER.find((key) => new RegExp(`\\b${level}\\b`).test(key));
    if (plan) return plan;
  }

  return FLOORS_ORDER[0];
}

export const CATEGORY_ORDER = [
  'Fashion',
  'Beauty',
  'F&B',
  'Sports',
  'Electronics',
  'Services',
  'Entertainment',
  'Books',
  'Furniture',
];

export const CATEGORY_COLORS: Record<string, string> = {
  Fashion: '#f6d8dc',
  Beauty: '#e7dbf4',
  'F&B': '#fbeed0',
  Sports: '#d8e9fb',
  Electronics: '#d9f0e2',
  Services: '#e8e8e6',
  Entertainment: '#fde3ec',
  Books: '#e4e9f7',
  Furniture: '#efe7db',
};

export interface FloorUnit {
  code: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  name?: string;
  cat?: string;
  sqm?: number;
}

/* Upper floors use an even, uniform grid of shop lots split into equal cells
   inside each city block. Equal cell sizes and fixed gaps make the tenant
   structure read as a tidy matrix (no uneven pile-ups), while the thin white
   "streets" between blocks stay as the walkable corridors. */
interface Block {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const BLOCKS: Block[] = [
  { x0: 20, y0: 20, x1: 127, y1: 134 },
  { x0: 163, y0: 20, x1: 297, y1: 134 },
  { x0: 323, y0: 20, x1: 440, y1: 134 },
  { x0: 20, y0: 198, x1: 127, y1: 286 },
  { x0: 163, y0: 198, x1: 297, y1: 286 },
  { x0: 323, y0: 198, x1: 440, y1: 286 },
];

// Named anchors on upper floors, addressed by (blockIndex, row, col).
const KNOWN_SLOTS: Record<string, Record<number, string>> = {
  'Floor 1': { 15: 'L1-12', 19: 'L1-02', 72: 'L1-08' },
  'Floor 2': { 36: 'L2-05', 90: 'L2-08' },
  'Floor 3': { 70: 'L3-01' },
};

const UPPER_COLS = 4;
const UPPER_ROWS = 4;
const UPPER_GAP = 3;

function buildUpperLots(prefix: string): FloorUnit[] {
  const lots: FloorUnit[] = [];
  let n = 0;
  BLOCKS.forEach((b) => {
    const bw = b.x1 - b.x0 - 6;
    const bh = b.y1 - b.y0 - 6;
    const colW = (bw - UPPER_GAP * (UPPER_COLS - 1)) / UPPER_COLS;
    const rowH = (bh - UPPER_GAP * (UPPER_ROWS - 1)) / UPPER_ROWS;
    for (let r = 0; r < UPPER_ROWS; r += 1) {
      for (let c = 0; c < UPPER_COLS; c += 1) {
        const idx = n;
        const code = `${prefix}-${String(idx + 1).padStart(2, '0')}`;
        lots.push({
          code,
          x: b.x0 + 3 + c * (colW + UPPER_GAP),
          y: b.y0 + 3 + r * (rowH + UPPER_GAP),
          w: colW,
          h: rowH,
        });
        n += 1;
      }
    }
  });
  return lots;
}

export const FLOOR_UNITS: Record<string, FloorUnit[]> = Object.fromEntries(
  FLOORS_ORDER.map((floor, fi) => {
    if (floor === 'Ground Floor') return [floor, []];
    const prefix = `L${fi}`;
    const lots = buildUpperLots(prefix);
    const overrides = KNOWN_SLOTS[floor] ?? {};
    Object.entries(overrides).forEach(([slot, code]) => {
      const idx = Number(slot);
      if (lots[idx]) lots[idx].code = code;
    });
    return [floor, lots];
  })
);

/* Ground Floor mirrors the reference site plan: organic shell, H&M slab on
   the left, a single tidy arc of shop boxes above the oval atrium, a neat
   F&B block on the right, sports/beauty row along the bottom, parking block
   outside. Rows are spaced with clean corridors instead of piling tenants up. */
const GROUND_UNITS: FloorUnit[] = [
  { code: 'HM-01', name: 'H&M', cat: 'Fashion', sqm: 2600, x: 44, y: 132, w: 110, h: 112 },
  { code: 'SV-01', name: 'Customer Service', cat: 'Services', sqm: 40, x: 176, y: 138, w: 44, h: 18 },
  { code: 'SV-02', name: 'Information', cat: 'Services', sqm: 30, x: 224, y: 138, w: 36, h: 18 },
  { code: 'A01', name: 'Miniso', cat: 'Fashion', sqm: 120, x: 158, y: 64, w: 34, h: 30 },
  { code: 'A02', name: 'Sneaker Zone', cat: 'Fashion', sqm: 95, x: 196, y: 64, w: 36, h: 30 },
  { code: 'A03', name: 'Watch Studio', cat: 'Fashion', sqm: 60, x: 236, y: 64, w: 34, h: 30 },
  { code: 'A04', name: 'iBox', cat: 'Electronics', sqm: 70, x: 274, y: 64, w: 30, h: 30 },
  { code: 'A05', name: 'Erafone', cat: 'Electronics', sqm: 70, x: 308, y: 64, w: 34, h: 30 },
  { code: 'B05', name: 'UNIQLO Home', cat: 'Fashion', sqm: 150, x: 346, y: 64, w: 40, h: 30 },
  { code: 'B06', name: 'POINTBREAK', cat: 'F&B', sqm: 95, x: 390, y: 64, w: 40, h: 30 },
  { code: 'B01', name: 'Steve Madden', cat: 'Fashion', sqm: 70, x: 340, y: 24, w: 32, h: 28, rot: -14 },
  { code: 'B02', name: 'PUMA', cat: 'Sports', sqm: 80, x: 376, y: 24, w: 28, h: 28, rot: -14 },
  { code: 'B03', name: 'FILA', cat: 'Sports', sqm: 70, x: 408, y: 24, w: 28, h: 28, rot: -14 },
  { code: 'B04', name: 'UNIQLO', cat: 'Fashion', sqm: 280, x: 440, y: 24, w: 24, h: 28, rot: -14 },
  { code: 'C09', name: 'Nature Republic', cat: 'Beauty', sqm: 88, x: 298, y: 100, w: 34, h: 32 },
  { code: 'C02', name: 'Kopi Kenangan', cat: 'F&B', sqm: 102, x: 336, y: 100, w: 40, h: 32 },
  { code: 'C03', name: 'LC Sign', cat: 'Services', sqm: 105, x: 380, y: 100, w: 36, h: 32 },
  { code: 'C05', name: 'MOKKA', cat: 'F&B', sqm: 85, x: 420, y: 100, w: 26, h: 32 },
  { code: 'C08', name: 'Starbucks', cat: 'F&B', sqm: 350, x: 340, y: 140, w: 54, h: 34 },
  { code: 'C07', name: 'Pizza e Birra', cat: 'F&B', sqm: 279, x: 398, y: 140, w: 50, h: 34 },
  { code: 'C01', name: 'Palace', cat: 'F&B', sqm: 120, x: 340, y: 178, w: 54, h: 26 },
  { code: 'C06', name: 'Gengki Sushi', cat: 'F&B', sqm: 90, x: 398, y: 178, w: 50, h: 26 },
  { code: 'A13', name: 'Mothercare', cat: 'Fashion', sqm: 110, x: 158, y: 210, w: 46, h: 34 },
  { code: 'A14', name: 'Sugar Life', cat: 'F&B', sqm: 60, x: 208, y: 210, w: 38, h: 30 },
  { code: 'SV-03', name: 'ATM Zone', cat: 'Services', sqm: 30, x: 250, y: 210, w: 34, h: 26 },
  { code: 'A06', name: 'Optik Seis', cat: 'Beauty', sqm: 80, x: 44, y: 250, w: 42, h: 32 },
  { code: 'A07', name: 'The Perfume Shop', cat: 'Beauty', sqm: 90, x: 90, y: 250, w: 46, h: 32 },
  { code: 'A08', name: "Victoria's Secret", cat: 'Beauty', sqm: 85, x: 140, y: 250, w: 42, h: 32 },
  { code: 'A10', name: 'adidas', cat: 'Sports', sqm: 210, x: 186, y: 250, w: 36, h: 32 },
  { code: 'A11', name: 'Skechers', cat: 'Sports', sqm: 180, x: 226, y: 250, w: 36, h: 32 },
  { code: 'A12', name: 'Fila Kids', cat: 'Sports', sqm: 150, x: 266, y: 250, w: 34, h: 32 },
  { code: 'A15', name: 'Crocs', cat: 'Sports', sqm: 80, x: 306, y: 250, w: 28, h: 32 },
  { code: 'PK-01', name: 'CAR PARKING', cat: 'Services', sqm: 41, x: 334, y: 206, w: 112, h: 96 },
];

FLOOR_UNITS['Ground Floor'] = GROUND_UNITS;

export interface RouteResult {
  points: { x: number; y: number }[];
  meters: number;
  minutes: number;
  turn: 'left' | 'right' | 'ahead';
  targetName: string;
}

export function computeRoute(
  floor: string,
  unitCode: string,
  userPos?: { x: number; y: number }
): RouteResult | null {
  const unit = FLOOR_UNITS[floor]?.find((u) => u.code === unitCode);
  const tenant = tenants.find((t) => t.unit === unitCode);
  if (!unit || !tenant) return null;

  const rawStart = userPos ?? { x: 230, y: 304 };
  const start = {
    x: rawStart.x,
    y: Math.min(188, Math.max(144, rawStart.y)),
  };
  const cx = unit.x + unit.w / 2;
  const edgeY = unit.y < 136 ? unit.y + unit.h : unit.y;
  const corridorY = 166;
  const points = [
    start,
    { x: start.x, y: corridorY },
    { x: cx, y: corridorY },
    { x: cx, y: edgeY },
  ];

  let len = 0;
  for (let i = 1; i < points.length; i += 1) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  const meters = Math.max(5, Math.round(len * 0.35));
  const minutes = Math.max(1, Math.round(meters / 80));
  const turn: RouteResult['turn'] =
    Math.abs(cx - start.x) <= 10 ? 'ahead' : cx < start.x ? 'left' : 'right';

  return { points, meters, minutes, turn, targetName: tenant.name };
}

export function computeRouteToPoint(
  start: { x: number; y: number },
  dest: { x: number; y: number }
): { points: { x: number; y: number }[]; meters: number; minutes: number } {
  const cl = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const s = { x: start.x, y: cl(start.y, 144, 188) };
  const d = { x: dest.x, y: dest.y };
  const points = [s, { x: s.x, y: 166 }, { x: d.x, y: 166 }, d];
  let len = 0;
  for (let i = 1; i < points.length; i += 1) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  const meters = Math.max(5, Math.round(len * 0.35));
  return { points, meters, minutes: Math.max(1, Math.round(meters / 80)) };
}

export function openDirections(tenant: TenantItem, origin?: string) {
  // Read straight from the bus: this helper is called from click handlers, not
  // during render, so there is no React state to subscribe to here.
  const { appName, appAddress } = getAppSettings();
  const destLabel = encodeURIComponent(
    `${tenant.name}, ${appName || 'SIM Mall'}, ${appAddress || MALL_LOCATION.address}`
  );
  const dest = tenant.geo ? `${tenant.geo.lat},${tenant.geo.lng}` : '';
  const go = (from?: string) => {
    const base = 'https://www.google.com/maps/dir/?api=1&travelmode=driving';
    window.open(
      from
        ? `${base}&origin=${from}&destination=${dest || destLabel}`
        : `${base}&destination=${dest || destLabel}`,
      '_blank'
    );
  };
  if (origin) {
    go(origin);
    return;
  }
  if (!('geolocation' in navigator)) {
    go();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => go(`${pos.coords.latitude},${pos.coords.longitude}`),
    () => go(),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}
