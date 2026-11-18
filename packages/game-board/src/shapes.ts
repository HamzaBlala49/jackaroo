/**
 * Board outline shapes.
 *
 * Every shape produces the same topology: `ringLength` cells sampled uniformly
 * by arc length, starting at the bottom (6 o'clock) and running clockwise.
 * The engine only ever consumes cell indices, so the rules are identical for
 * every outline; only the pixel geometry changes.
 */

export type BoardShape = 'circle' | 'square' | 'hexagon' | 'oval';

export interface ShapePoint {
  x: number;
  y: number;
}

export interface ShapeFrame {
  /** ringLength points, arc-length uniform, index 0 at the bottom, clockwise. */
  points: ShapePoint[];
  /** Unit tangent at every point (clockwise direction). */
  tangents: ShapePoint[];
  /** Unit normal pointing toward the board centre at every point. */
  inward: ShapePoint[];
  /** Closed SVG path tracing the full outline (for decorative rendering). */
  outlinePath: string;
}

export const BOARD_SHAPES: BoardShape[] = ['circle', 'square', 'hexagon', 'oval'];

const CENTER = 500;
const DENSE_SAMPLES = 1440;

/** Reference sizes chosen so bases/docks always fit inside the 1000×1000 viewBox. */
const CIRCLE_RADIUS = 342;
const SQUARE_FLAT = 300; // superellipse |x/a|⁴+|y/a|⁴=1 → corners ≈ 1.19a ≈ 356
const HEXAGON_RADIUS = 340;
const OVAL_A = 350;
const OVAL_B = 270;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function superellipsePoint(a: number, exponent: number, theta: number): ShapePoint {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return {
    x: CENTER + a * Math.sign(c) * Math.pow(Math.abs(c), exponent),
    y: CENTER + a * Math.sign(s) * Math.pow(Math.abs(s), exponent),
  };
}

function hexagonPoint(radius: number, t: number): ShapePoint {
  const vertices: ShapePoint[] = Array.from({ length: 6 }, (_, i) => {
    const angle = toRad(90 + i * 60);
    return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
  });
  const position = t * 6;
  const edge = Math.min(5, Math.floor(position));
  const frac = position - edge;
  const a = vertices[edge]!;
  const b = vertices[(edge + 1) % 6]!;
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

function outlinePoint(shape: BoardShape, t: number): ShapePoint {
  const theta = toRad(90 + 360 * t);
  switch (shape) {
    case 'circle':
      return { x: CENTER + CIRCLE_RADIUS * Math.cos(theta), y: CENTER + CIRCLE_RADIUS * Math.sin(theta) };
    case 'square':
      // Superellipse with n=4: rounded square with soft corners.
      return superellipsePoint(SQUARE_FLAT, 0.5, theta);
    case 'hexagon':
      return hexagonPoint(HEXAGON_RADIUS, t);
    case 'oval':
      return { x: CENTER + OVAL_A * Math.cos(theta), y: CENTER + OVAL_B * Math.sin(theta) };
    default:
      return { x: CENTER + CIRCLE_RADIUS * Math.cos(theta), y: CENTER + CIRCLE_RADIUS * Math.sin(theta) };
  }
}

function dist(a: ShapePoint, b: ShapePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function normalize(p: ShapePoint): ShapePoint {
  const length = Math.hypot(p.x, p.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: p.x / length, y: p.y / length };
}

function polarAngle(p: ShapePoint): number {
  const deg = (Math.atan2(p.y - CENTER, p.x - CENTER) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function tangentAngle(tangent: ShapePoint): number {
  const deg = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function pointPolarAngle(p: ShapePoint): number {
  return polarAngle(p);
}

/**
 * Builds the shared outline frame for a board shape.
 * The dense polyline is resampled by arc length so the 72 ring cells are evenly
 * spaced along the perimeter for every shape.
 */
export function buildShapeFrame(shape: BoardShape, ringLength: number): ShapeFrame {
  const dense: ShapePoint[] = Array.from({ length: DENSE_SAMPLES }, (_, i) =>
    outlinePoint(shape, i / DENSE_SAMPLES),
  );

  // Cumulative arc length around the closed outline.
  const cumulative: number[] = [0];
  for (let i = 1; i <= DENSE_SAMPLES; i += 1) {
    const prev = dense[i - 1]!;
    const current = dense[i % DENSE_SAMPLES]!;
    cumulative.push(cumulative[i - 1]! + dist(prev, current));
  }
  const total = cumulative[DENSE_SAMPLES]!;

  const pointAtArc = (arc: number): { point: ShapePoint; before: ShapePoint; after: ShapePoint } => {
    const target = ((arc % total) + total) % total;
    let lo = 0;
    let hi = DENSE_SAMPLES;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((cumulative[mid + 1] ?? total) < target) lo = mid + 1;
      else hi = mid;
    }
    const segmentStart = cumulative[lo]!;
    const segmentEnd = cumulative[lo + 1] ?? total;
    const frac = segmentEnd - segmentStart === 0 ? 0 : (target - segmentStart) / (segmentEnd - segmentStart);
    const a = dense[lo % DENSE_SAMPLES]!;
    const b = dense[(lo + 1) % DENSE_SAMPLES]!;
    return {
      point: { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac },
      before: dense[(lo - 1 + DENSE_SAMPLES) % DENSE_SAMPLES]!,
      after: dense[(lo + 2) % DENSE_SAMPLES]!,
    };
  };

  const points: ShapePoint[] = [];
  const tangents: ShapePoint[] = [];
  const inward: ShapePoint[] = [];

  for (let i = 0; i < ringLength; i += 1) {
    const arc = (i / ringLength) * total;
    const { point, before, after } = pointAtArc(arc);
    const tangent = normalize({ x: after.x - before.x, y: after.y - before.y });
    // Inward normal: perpendicular to the tangent, flipped toward the centre.
    let normal: ShapePoint = { x: -tangent.y, y: tangent.x };
    const toCenter = { x: CENTER - point.x, y: CENTER - point.y };
    if (normal.x * toCenter.x + normal.y * toCenter.y < 0) {
      normal = { x: -normal.x, y: -normal.y };
    }
    points.push({ x: Math.round(point.x * 10_000) / 10_000, y: Math.round(point.y * 10_000) / 10_000 });
    tangents.push(tangent);
    inward.push(normal);
  }

  // Decorative outline path (closed polyline through the dense samples).
  const step = Math.max(1, Math.floor(DENSE_SAMPLES / 180));
  let outlinePath = '';
  for (let i = 0; i < DENSE_SAMPLES; i += step) {
    const p = dense[i]!;
    outlinePath += `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  }
  const first = dense[0]!;
  outlinePath += `L ${first.x.toFixed(2)} ${first.y.toFixed(2)} Z`;

  return { points, tangents, inward, outlinePath };
}

export const SHAPE_SIZES = {
  circle: CIRCLE_RADIUS,
  square: SQUARE_FLAT,
  hexagon: HEXAGON_RADIUS,
  oval: OVAL_A,
} as const;
