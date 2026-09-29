import { FLOOR_UNITS } from '../../../landing/mallData';
import type { FloorUnit } from '../../../landing/mallData';

/* Obstacle-aware rectilinear router.
 *
 * Instead of a single corridor spine (which used to run straight through
 * tenants like H&M and the F&B cluster), we build a coarse navigability grid
 * per floor and BFS a path through the walkable gaps BETWEEN tenant blocks.
 * Every route therefore hugs the aisle around a unit's storefront and never
 * cuts across a tenant.
 */

const GRID = 3; // grid cell size in unit-space px
const W = 460;
const H = 340;

interface GridAccess {
  cols: number;
  rows: number;
  obstacle: Float32Array; // packed 0 = walkable, 1 = inside a tenant
  unitRects: FloorUnit[];
}

const cache = new Map<string, GridAccess>();

function pointInRect(px: number, py: number, r: FloorUnit, pad: number): boolean {
  const left = r.x - pad;
  const right = r.x + r.w + pad;
  const top = r.y - pad;
  const bottom = r.y + r.h + pad;
  return px >= left && px <= right && py >= top && py <= bottom;
}

function buildGrid(floor: string): GridAccess {
  const cols = Math.ceil(W / GRID);
  const rows = Math.ceil(H / GRID);
  const obstacle = new Float32Array(cols * rows);
  const unitRects = FLOOR_UNITS[floor] ?? [];

  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      const px = cx * GRID + GRID / 2;
      const py = cy * GRID + GRID / 2;
      let inside = false;
      for (const r of unitRects) {
        if (pointInRect(px, py, r, 1)) {
          inside = true;
          break;
        }
      }
      obstacle[cy * cols + cx] = inside ? 1 : 0;
    }
  }

  return { cols, rows, obstacle, unitRects };
}

function getGrid(floor: string): GridAccess {
  let g = cache.get(floor);
  if (!g) {
    g = buildGrid(floor);
    cache.set(floor, g);
  }
  return g;
}

function cellToXY(cell: number, cols: number): { x: number; y: number } {
  const cx = cell % cols;
  const cy = Math.floor(cell / cols);
  return { x: cx * GRID + GRID / 2, y: cy * GRID + GRID / 2 };
}

/* Snap an arbitrary point to the nearest walkable cell (used for the start). */
function snapStart(g: GridAccess, p: { x: number; y: number }): number {
  const cx = Math.round((p.x - GRID / 2) / GRID);
  const cy = Math.round((p.y - GRID / 2) / GRID);
  const cols = g.cols;
  const rows = g.rows;
  let best = -1;
  let bestDist = Infinity;
  const cx0 = Math.max(0, Math.min(cols - 1, cx));
  const cy0 = Math.max(0, Math.min(rows - 1, cy));
  const reach = 40;
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const ny = cy0 + dy;
      const nx = cx0 + dx;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const idx = ny * cols + nx;
      if (g.obstacle[idx]) continue;
      const pt = cellToXY(idx, cols);
      const d = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    }
  }
  return best;
}

/* Walkable cells immediately adjacent to a unit rect = its storefront ring. */
function doorCells(g: GridAccess, r: FloorUnit): number[] {
  const out: number[] = [];
  const cols = g.cols;
  const rows = g.rows;
  const iy0 = Math.max(0, Math.floor((r.y - GRID) / GRID));
  const iy1 = Math.min(rows - 1, Math.floor((r.y + r.h + GRID) / GRID));
  const ix0 = Math.max(0, Math.floor((r.x - GRID) / GRID));
  const ix1 = Math.min(cols - 1, Math.floor((r.x + r.w + GRID) / GRID));
  for (let cy = iy0; cy <= iy1; cy += 1) {
    for (let cx = ix0; cx <= ix1; cx += 1) {
      if (!g.obstacle[cy * cols + cx]) out.push(cy * cols + cx);
    }
  }
  return out;
}

const DIRS: [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/* BFS from a start cell to any walkable cell adjacent to the target rect.
   Returns the full cell-index path (including the door cell). */
function bfsToUnit(g: GridAccess, start: number, r: FloorUnit): number[] {
  const cols = g.cols;
  const rows = g.rows;
  const goals = new Set(doorCells(g, r));
  if (goals.size === 0) return [];
  const prev = new Int32Array(cols * rows).fill(-2);
  const queue: number[] = [];
  prev[start] = -1;
  queue.push(start);
  let goal = -1;

  for (let qi = 0; qi < queue.length; qi += 1) {
    const cur = queue[qi];
    if (goals.has(cur)) {
      goal = cur;
      break;
    }
    const ccx = cur % cols;
    const ccy = Math.floor(cur / cols);
    for (const [dx, dy] of DIRS) {
      const nx = ccx + dx;
      const ny = ccy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx;
      if (g.obstacle[ni]) continue;
      if (prev[ni] !== -2) continue;
      prev[ni] = cur;
      queue.push(ni);
    }
  }

  if (goal === -1) return [];
  const path: number[] = [];
  let cur = goal;
  while (cur !== -1) {
    path.push(cur);
    cur = prev[cur];
  }
  return path.reverse();
}

/* Remove intermediate collinear cells so the route is a clean polyline.
   The route ends at the goal (door) cell, which always stays in a walkable
   gap next to the tenant, never inside it. */
function thinPath(g: GridAccess, cells: number[]): { x: number; y: number }[] {
  const pts = cells.map((c) => cellToXY(c, g.cols));
  if (pts.length === 0) return [];
  const thinned: { x: number; y: number }[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = thinned[thinned.length - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const collinear =
      Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) < 1e-6;
    if (!collinear) thinned.push(b);
  }
  thinned.push(pts[pts.length - 1]);
  return thinned;
}

/* Public API: route from `from` to the storefront (door) of `unit` on `floor`. */
export function routeToUnit(
  floor: string,
  from: { x: number; y: number },
  unit: FloorUnit
): { x: number; y: number }[] {
  const g = getGrid(floor);
  const start = snapStart(g, from);
  if (start === -1) return [];
  const cells = bfsToUnit(g, start, unit);
  if (cells.length === 0) return [];
  const pts = thinPath(g, cells);
  pts[0] = { x: from.x, y: from.y };
  return pts;
}
