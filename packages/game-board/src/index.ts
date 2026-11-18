import {
  BOARD_HOME_LANE_LENGTH,
  BOARD_RING_LENGTH,
  DEFAULT_RULES,
  PLAYERS_PER_TEAM,
  TOTAL_ROUTE_LENGTH,
} from '@jackaroo/game-config';
import type { PlayerCount } from '@jackaroo/game-types';

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

export interface Point {
  x: number;
  y: number;
}

export interface BoardRingCell extends Point {
  index: number;
  angleDeg: number;
  isStart: boolean;
  startSeat: number | null;
  isNeutralSafe: boolean;
  isSafe: boolean;
}

export interface BoardHomeSlot extends Point {
  slot: number;
  radius: number;
}

export interface BoardStation {
  seat: number;
  teamId: number;
  startIndex: number;
  homeGateIndex: number;
  startAngleDeg: number;
  homeAngleDeg: number;
  start: Point;
  homeSlots: BoardHomeSlot[];
  homeLanePath: string;
  baseCenter: Point;
  baseSockets: Point[];
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
  playerCount: PlayerCount;
  teamCount: number;
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
}

export interface BoardModelOptions {
  ringLength?: number;
  homeLaneLength?: number;
  safePositions?: number[];
}

const modelCache = new Map<string, BoardModel>();

const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

export function polarPoint(
  radius: number,
  angleDeg: number,
  center: Point = { x: BOARD_CENTER, y: BOARD_CENTER },
): Point {
  const angle = toRad(angleDeg);
  return {
    x: roundCoordinate(center.x + radius * Math.cos(angle)),
    y: roundCoordinate(center.y + radius * Math.sin(angle)),
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

function makeHomeLanePath(
  angleDeg: number,
  innerRadius: number,
  outerRadius: number,
  halfWidthDeg: number,
): string {
  const outerLeft = polarPoint(outerRadius, angleDeg - halfWidthDeg);
  const outerRight = polarPoint(outerRadius, angleDeg + halfWidthDeg);
  const innerRight = polarPoint(innerRadius, angleDeg + halfWidthDeg);
  const innerLeft = polarPoint(innerRadius, angleDeg - halfWidthDeg);
  return [
    `M ${outerLeft.x.toFixed(2)} ${outerLeft.y.toFixed(2)}`,
    `L ${outerRight.x.toFixed(2)} ${outerRight.y.toFixed(2)}`,
    `L ${innerRight.x.toFixed(2)} ${innerRight.y.toFixed(2)}`,
    `L ${innerLeft.x.toFixed(2)} ${innerLeft.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function createBoardModel(
  playerCount: PlayerCount,
  options: BoardModelOptions = {},
): BoardModel {
  const ringLength = options.ringLength ?? DEFAULT_RULES.board.ringLength;
  const homeLaneLength = options.homeLaneLength ?? DEFAULT_RULES.board.homeLaneLength;
  const safePositions = options.safePositions ?? DEFAULT_RULES.safePositions;
  const cacheKey = `${playerCount}:${ringLength}:${homeLaneLength}:${safePositions.join(',')}`;
  const cached = modelCache.get(cacheKey);
  if (cached) return cached;

  if (![4, 6, 8].includes(playerCount)) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }
  if (ringLength % 2 !== 0 || homeLaneLength < 1) {
    throw new Error('Invalid board dimensions.');
  }

  const teamCount = playerCount / PLAYERS_PER_TEAM;
  const starts = getStartIndices(playerCount, ringLength);
  const startSeatByIndex = new Map<number, number>();
  starts.forEach((index, seat) => startSeatByIndex.set(index, seat));

  const neutralSafe = new Set(
    safePositions.map((index) => ((index % ringLength) + ringLength) % ringLength),
  );

  const ring: BoardRingCell[] = Array.from({ length: ringLength }, (_, index) => {
    const angleDeg = ringAngle(index, ringLength);
    const isStart = startSeatByIndex.has(index);
    const isNeutralSafe = neutralSafe.has(index);
    return {
      ...polarPoint(RING_RADIUS, angleDeg),
      index,
      angleDeg,
      isStart,
      startSeat: startSeatByIndex.get(index) ?? null,
      isNeutralSafe,
      isSafe: isStart || isNeutralSafe,
    };
  });

  const stations: BoardStation[] = starts.map((startIndex, seat) => {
    const teamId = getTeamIdForSeat(seat, teamCount);
    const startAngleDeg = ringAngle(startIndex, ringLength);
    const homeGateIndex = (startIndex - 1 + ringLength) % ringLength;
    const homeAngleDeg = ringAngle(homeGateIndex, ringLength);
    const start = polarPoint(RING_RADIUS, startAngleDeg);
    const homeSlots = HOME_SLOT_RADII.map((radius, slot) => ({
      ...polarPoint(radius, homeAngleDeg),
      slot,
      radius,
    }));
    const baseCenter = polarPoint(BASE_RADIUS, startAngleDeg);
    const radial = {
      x: Math.cos(toRad(startAngleDeg)),
      y: Math.sin(toRad(startAngleDeg)),
    };
    const tangent = {
      x: -Math.sin(toRad(startAngleDeg)),
      y: Math.cos(toRad(startAngleDeg)),
    };
    const baseSockets: Point[] = [];
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const radialOffset = (row === 0 ? -1 : 1) * BASE_SOCKET_RADIAL;
        const tangentOffset = (column === 0 ? -1 : 1) * BASE_SOCKET_TANGENTIAL;
        baseSockets.push({
          x: roundCoordinate(baseCenter.x + radial.x * radialOffset + tangent.x * tangentOffset),
          y: roundCoordinate(baseCenter.y + radial.y * radialOffset + tangent.y * tangentOffset),
        });
      }
    }

    return {
      seat,
      teamId,
      startIndex,
      homeGateIndex,
      startAngleDeg,
      homeAngleDeg,
      start,
      homeSlots,
      homeLanePath: makeHomeLanePath(homeAngleDeg, MEDALLION_RADIUS + 8, RING_RADIUS - 22, 2.6),
      baseCenter,
      baseSockets,
      baseAngleDeg: startAngleDeg,
      // Player identity chips sit in the felt gap between the base dock and the ring.
      seatAnchor: polarPoint(380, startAngleDeg),
      routeRingIndices: Array.from(
        { length: ringLength },
        (_, offset) => (startIndex + offset) % ringLength,
      ),
    };
  });

  const model: BoardModel = {
    playerCount,
    teamCount,
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
  return TOTAL_ROUTE_LENGTH;
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
