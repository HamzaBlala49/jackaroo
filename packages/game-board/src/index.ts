import {
  BOARD_HOME_LANE_LENGTH,
  BOARD_RING_LENGTH,
  DEFAULT_RULES,
  PLAYERS_PER_TEAM,
} from '@jackaroo/game-config';
import type { PlayerCount } from '@jackaroo/game-types';
import {
  BOARD_SHAPES,
  buildShapeFrame,
  pointPolarAngle,
  tangentAngle,
  type BoardShape,
  type ShapePoint,
} from './shapes';

export * from './shapes';
export { buildMarbleLayout, type RenderMarble } from './marble-layout';

export const VIEWBOX_SIZE = 1000;
export const BOARD_CENTER = 500;
export const BOARD_RADIUS = 494;
export const FELT_RADIUS = 462;
export const RING_RADIUS = 342;
export const RING_CELL_SIZE = 30;
export const START_CELL_SIZE = 38;
export const HOME_SLOT_RADII = [296, 252, 208, 164] as const;
export const HOME_SLOT_SIZE = 29;
export const MEDALLION_RADIUS = 116;
export const BASE_RADIUS = 438;
export const BASE_SOCKET_RADIAL = 14;
export const BASE_SOCKET_TANGENTIAL = 18;

/** Distance from the gate cell to each home slot, along the inward normal. */
const HOME_SLOT_OFFSETS = [46, 90, 134, 178] as const;
/** How far the base dock centre sits outside the start cell. */
const BASE_DOCK_OFFSET = 96;
/** How far the player badge sits outside the start cell. */
const SEAT_ANCHOR_OFFSET = 38;
/** Half width of the decorative home-lane wedge. */
const HOME_LANE_HALF_WIDTH = 15.5;
/** The lane wedge starts slightly inside the ring and stops near the medallion. */
const HOME_LANE_INNER_START = 22;
const HOME_LANE_OUTER_END = 218;

export type BoardShapeName = BoardShape;

export interface Point {
  x: number;
  y: number;
}

export interface BoardRingCell extends Point {
  index: number;
  /** Polar angle of the cell (degrees, 0 = right, 90 = bottom). */
  angleDeg: number;
  /** Rotation that orients the cell along the outline (degrees). */
  rotationDeg: number;
  isStart: boolean;
  startSeat: number | null;
  isNeutralSafe: boolean;
  isSafe: boolean;
}

export interface BoardHomeSlot extends Point {
  slot: number;
  /** Rotation that orients the slot along the home lane (degrees). */
  rotationDeg: number;
}

export interface BoardStation {
  seat: number;
  teamId: number;
  startIndex: number;
  homeGateIndex: number;
  /** Polar angle of the start cell (kept for the legacy web renderer). */
  startAngleDeg: number;
  /** Polar angle of the home gate (kept for the legacy web renderer). */
  homeAngleDeg: number;
  /** Rotation of the home slots (tangent angle at the gate). */
  homeRotationDeg: number;
  /** Rotation of the base dock (tangent angle at the start cell). */
  baseRotationDeg: number;
  start: Point;
  homeSlots: BoardHomeSlot[];
  homeLanePath: string;
  baseCenter: Point;
  baseSockets: Point[];
  /** Polar angle of the base centre (kept for the legacy web renderer). */
  baseAngleDeg: number;
  seatAnchor: Point;
  routeRingIndices: number[];
}

export interface BoardSeatAnchor extends Point {
  seat: number;
  teamId: number;
  angleDeg: number;
}

export interface BoardModel {
  playerCount: number;
  teamCount: number;
  shape: BoardShape;
  ringLength: number;
  homeLaneLength: number;
  routeLength: number;
  viewBoxSize: number;
  center: Point;
  boardRadius: number;
  feltRadius: number;
  ringRadius: number;
  ringCellSize: number;
  startCellSize: number;
  homeSlotSize: number;
  medallionRadius: number;
  baseRadius: number;
  starts: number[];
  safeRingIndices: number[];
  ring: BoardRingCell[];
  stations: BoardStation[];
  seatAnchors: BoardSeatAnchor[];
  /** Closed SVG path tracing the board outline (decorative). */
  outlinePath: string;
}

export interface BoardModelOptions {
  ringLength?: number;
  homeLaneLength?: number;
  safePositions?: number[];
  shape?: BoardShape;
}

const modelCache = new Map<string, BoardModel>();

const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function polarPoint(
  radius: number,
  angleDeg: number,
  center: Point = { x: BOARD_CENTER, y: BOARD_CENTER },
): Point {
  const angle = toRad(angleDeg);
  return {
    x: round(center.x + radius * Math.cos(angle)),
    y: round(center.y + radius * Math.sin(angle)),
  };
}

/** Rounds geometry so SSR and browser float maths produce identical markup. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function ringAngle(index: number, ringLength = BOARD_RING_LENGTH): number {
  return 90 + index * (360 / ringLength);
}

export function getStartIndices(playerCount: PlayerCount, ringLength = BOARD_RING_LENGTH): number[] {
  if (ringLength % playerCount !== 0) {
    throw new Error(`Ring length ${ringLength} must divide evenly across ${playerCount} players.`);
  }
  const spacing = ringLength / playerCount;
  return Array.from({ length: playerCount }, (_, seat) => seat * spacing);
}

export function getTeamIdForSeat(seat: number, teamCount: number): number {
  return seat % teamCount;
}

function addScaled(point: ShapePoint, direction: ShapePoint, distance: number): Point {
  return {
    x: round(point.x + direction.x * distance),
    y: round(point.y + direction.y * distance),
  };
}

export function createBoardModel(
  playerCount: PlayerCount,
  options: BoardModelOptions = {},
): BoardModel {
  const ringLength = options.ringLength ?? DEFAULT_RULES.board.ringLength;
  const homeLaneLength = options.homeLaneLength ?? DEFAULT_RULES.board.homeLaneLength;
  const safePositions = options.safePositions ?? DEFAULT_RULES.safePositions;
  const shape: BoardShape = options.shape ?? 'circle';
  const cacheKey = `${playerCount}:${ringLength}:${homeLaneLength}:${safePositions.join(',')}:${shape}`;
  const cached = modelCache.get(cacheKey);
  if (cached) return cached;

  if (![4, 6, 8].includes(playerCount)) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }
  if (ringLength % 2 !== 0 || homeLaneLength < 1) {
    throw new Error('Invalid board dimensions.');
  }
  if (shape !== 'circle' && ringLength !== BOARD_RING_LENGTH) {
    // Non-circle outlines are tuned for the default 72-cell ring.
    throw new Error('Alternate board shapes require the default ring length.');
  }

  const teamCount = playerCount / PLAYERS_PER_TEAM;
  const starts = getStartIndices(playerCount, ringLength);
  const startSeatByIndex = new Map<number, number>();
  starts.forEach((index, seat) => startSeatByIndex.set(index, seat));

  const neutralSafe = new Set(
    safePositions.map((index) => ((index % ringLength) + ringLength) % ringLength),
  );

  const frame = buildShapeFrame(shape, ringLength);

  const ring: BoardRingCell[] = frame.points.map((point, index) => {
    const isStart = startSeatByIndex.has(index);
    const isNeutralSafe = neutralSafe.has(index);
    return {
      x: point.x,
      y: point.y,
      index,
      angleDeg: round(pointPolarAngle(point)),
      rotationDeg: round(tangentAngle(frame.tangents[index]!)),
      isStart,
      startSeat: startSeatByIndex.get(index) ?? null,
      isNeutralSafe,
      isSafe: isStart || isNeutralSafe,
    };
  });

  const stations: BoardStation[] = starts.map((startIndex, seat) => {
    const teamId = getTeamIdForSeat(seat, teamCount);
    const homeGateIndex = (startIndex - 1 + ringLength) % ringLength;

    const startPoint = frame.points[startIndex]!;
    const startTangent = frame.tangents[startIndex]!;
    const startInward = frame.inward[startIndex]!;
    const startOutward: ShapePoint = { x: -startInward.x, y: -startInward.y };

    const gatePoint = frame.points[homeGateIndex]!;
    const gateTangent = frame.tangents[homeGateIndex]!;
    const gateInward = frame.inward[homeGateIndex]!;

    const startAngleDeg = round(pointPolarAngle(startPoint));
    const homeAngleDeg = round(pointPolarAngle(gatePoint));
    const homeRotationDeg = round(tangentAngle(gateTangent));
    const baseRotationDeg = round(tangentAngle(startTangent));

    const homeSlots: BoardHomeSlot[] = HOME_SLOT_OFFSETS.slice(0, homeLaneLength).map(
      (offset, slot) => ({
        ...addScaled(gatePoint, gateInward, offset),
        slot,
        rotationDeg: homeRotationDeg,
      }),
    );

    // Decorative wedge from just inside the ring toward the medallion.
    const wedgeOuterA = addScaled(gatePoint, gateInward, HOME_LANE_INNER_START - 0);
    const wedgeInner = addScaled(gatePoint, gateInward, HOME_LANE_OUTER_END);
    const outerLeft = addScaled(wedgeOuterA, gateTangent, HOME_LANE_HALF_WIDTH);
    const outerRight = addScaled(wedgeOuterA, gateTangent, -HOME_LANE_HALF_WIDTH);
    const innerRight = addScaled(wedgeInner, gateTangent, -HOME_LANE_HALF_WIDTH);
    const innerLeft = addScaled(wedgeInner, gateTangent, HOME_LANE_HALF_WIDTH);
    const homeLanePath = [
      `M ${outerLeft.x} ${outerLeft.y}`,
      `L ${outerRight.x} ${outerRight.y}`,
      `L ${innerRight.x} ${innerRight.y}`,
      `L ${innerLeft.x} ${innerLeft.y}`,
      'Z',
    ].join(' ');

    const baseCenter = addScaled(startPoint, startOutward, BASE_DOCK_OFFSET);
    const baseSockets: Point[] = [];
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const tangentialOffset = (column === 0 ? -1 : 1) * BASE_SOCKET_TANGENTIAL;
        const radialOffset = (row === 0 ? 1 : -1) * BASE_SOCKET_RADIAL;
        baseSockets.push({
          x: round(baseCenter.x + startTangent.x * tangentialOffset + startOutward.x * radialOffset),
          y: round(baseCenter.y + startTangent.y * tangentialOffset + startOutward.y * radialOffset),
        });
      }
    }

    const seatAnchor = addScaled(startPoint, startOutward, SEAT_ANCHOR_OFFSET);

    return {
      seat,
      teamId,
      startIndex,
      homeGateIndex,
      startAngleDeg,
      homeAngleDeg,
      homeRotationDeg,
      baseRotationDeg,
      start: { x: startPoint.x, y: startPoint.y },
      homeSlots,
      homeLanePath,
      baseCenter,
      baseSockets,
      baseAngleDeg: round((baseRotationDeg - 90 + 360) % 360),
      seatAnchor,
      routeRingIndices: Array.from(
        { length: ringLength },
        (_, offset) => (startIndex + offset) % ringLength,
      ),
    };
  });

  const model: BoardModel = {
    playerCount,
    teamCount,
    shape,
    ringLength,
    homeLaneLength,
    routeLength: ringLength + homeLaneLength,
    viewBoxSize: VIEWBOX_SIZE,
    center: { x: BOARD_CENTER, y: BOARD_CENTER },
    boardRadius: BOARD_RADIUS,
    feltRadius: FELT_RADIUS,
    ringRadius: RING_RADIUS,
    ringCellSize: RING_CELL_SIZE,
    startCellSize: START_CELL_SIZE,
    homeSlotSize: HOME_SLOT_SIZE,
    medallionRadius: MEDALLION_RADIUS,
    baseRadius: BASE_RADIUS,
    starts,
    safeRingIndices: Array.from(neutralSafe)
      .filter((index) => !startSeatByIndex.has(index))
      .concat(starts)
      .sort((a, b) => a - b),
    ring,
    stations,
    seatAnchors: stations.map((station) => ({
      ...station.seatAnchor,
      seat: station.seat,
      teamId: station.teamId,
      angleDeg: station.startAngleDeg,
    })),
    outlinePath: frame.outlinePath,
  };

  modelCache.set(cacheKey, model);
  return model;
}

export function clearBoardModelCache(): void {
  modelCache.clear();
}

export function getStation(model: BoardModel, seat: number): BoardStation {
  const station = model.stations[seat];
  if (!station) throw new Error(`No station for seat ${seat}`);
  return station;
}

export function ringCellForProgress(model: BoardModel, seat: number, progress: number): number {
  const station = getStation(model, seat);
  if (!Number.isInteger(progress) || progress < 0 || progress >= model.ringLength) {
    throw new Error(`Progress ${progress} is not a ring cell for seat ${seat}`);
  }
  return (station.startIndex + progress) % model.ringLength;
}

export function progressForRingCell(model: BoardModel, seat: number, cell: number): number {
  const station = getStation(model, seat);
  return ((cell - station.startIndex) % model.ringLength + model.ringLength) % model.ringLength;
}

export function pointForProgress(model: BoardModel, seat: number, progress: number): Point {
  const station = getStation(model, seat);
  if (progress < 0 || progress >= model.routeLength) {
    throw new Error(`Progress ${progress} is outside the route for seat ${seat}`);
  }
  if (progress < model.ringLength) {
    const cell = model.ring[ringCellForProgress(model, seat, progress)];
    if (!cell) throw new Error(`No ring cell for progress ${progress}`);
    return { x: cell.x, y: cell.y };
  }
  const slot = station.homeSlots[progress - model.ringLength];
  if (!slot) throw new Error(`No home slot for progress ${progress}`);
  return { x: slot.x, y: slot.y };
}

export function pointForBaseSocket(model: BoardModel, seat: number, marbleIndex: number): Point {
  const station = getStation(model, seat);
  const socket = station.baseSockets[marbleIndex];
  if (!socket) throw new Error(`No base socket ${marbleIndex} for seat ${seat}`);
  return socket;
}

/** Returns each route point from `fromProgress` to `toProgress`, inclusive. */
export function getRoutePoints(
  model: BoardModel,
  seat: number,
  fromProgress: number,
  toProgress: number,
): Point[] {
  const step = toProgress >= fromProgress ? 1 : -1;
  const points: Point[] = [];
  for (let progress = fromProgress; ; progress += step) {
    points.push(pointForProgress(model, seat, progress));
    if (progress === toProgress) break;
  }
  return points;
}

export function isPositionSafe(
  model: BoardModel,
  seat: number,
  progress: number | null,
): boolean {
  if (progress === null) return true;
  if (progress >= model.ringLength) return true;
  const cell = ringCellForProgress(model, seat, progress);
  return model.ring[cell]?.isSafe ?? false;
}

export function routePointCount(model: BoardModel): number {
  return model.routeLength;
}

export function homeLaneLength(): number {
  return BOARD_HOME_LANE_LENGTH;
}

/** Converts a 0..1000 SVG point to a CSS percentage within an aspect-square stage. */
export function normalizePoint(point: Point): { xPercent: number; yPercent: number } {
  return {
    xPercent: (point.x / VIEWBOX_SIZE) * 100,
    yPercent: (point.y / VIEWBOX_SIZE) * 100,
  };
}

export function describeRingArc(
  startIndex: number,
  endIndex: number,
  radius = RING_RADIUS,
  ringLength = BOARD_RING_LENGTH,
): string {
  const start = polarPoint(radius, ringAngle(startIndex, ringLength));
  const end = polarPoint(radius, ringAngle(endIndex, ringLength));
  const rawSweep = (endIndex - startIndex + ringLength) % ringLength;
  const sweep = rawSweep === 0 ? 360 : rawSweep * (360 / ringLength);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export { BOARD_SHAPES };
