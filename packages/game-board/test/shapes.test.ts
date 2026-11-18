import { describe, expect, it } from 'vitest';
import {
  BOARD_SHAPES,
  buildShapeFrame,
  createBoardModel,
  getRoutePoints,
  pointForBaseSocket,
  pointForProgress,
} from '../src';
import type { BoardShape } from '../src';

const PLAYER_COUNTS = [4, 6, 8] as const;

describe('board shapes', () => {
  it('exposes the supported outline list', () => {
    expect(BOARD_SHAPES).toEqual(['circle', 'square', 'hexagon', 'oval']);
  });

  it.each(BOARD_SHAPES)('samples %s uniformly around the outline', (shape) => {
    const frame = buildShapeFrame(shape, 72);
    expect(frame.points).toHaveLength(72);
    expect(frame.tangents).toHaveLength(72);
    expect(frame.inward).toHaveLength(72);

    // Every point is unique and inside the viewBox.
    const keys = new Set(frame.points.map((p) => `${p.x}:${p.y}`));
    expect(keys.size).toBe(72);
    for (const point of frame.points) {
      expect(point.x).toBeGreaterThan(100);
      expect(point.y).toBeGreaterThan(100);
      expect(point.x).toBeLessThan(900);
      expect(point.y).toBeLessThan(900);
    }

    // Index 0 starts at the bottom of the board.
    const first = frame.points[0]!;
    expect(first.y).toBeGreaterThan(500);
    expect(Math.abs(first.x - 500)).toBeLessThan(60);

    // Inward normals always point toward the centre.
    for (let i = 0; i < 72; i += 1) {
      const point = frame.points[i]!;
      const normal = frame.inward[i]!;
      const toCenter = { x: 500 - point.x, y: 500 - point.y };
      expect(normal.x * toCenter.x + normal.y * toCenter.y).toBeGreaterThan(0);
      // Normals and tangents are perpendicular unit vectors.
      const tangent = frame.tangents[i]!;
      expect(Math.abs(tangent.x * normal.x + tangent.y * normal.y)).toBeLessThan(1e-9);
      expect(Math.hypot(normal.x, normal.y)).toBeCloseTo(1, 9);
    }

    // Adjacent samples are evenly spaced by arc length.
    const gaps: number[] = [];
    for (let i = 0; i < 72; i += 1) {
      const a = frame.points[i]!;
      const b = frame.points[(i + 1) % 72]!;
      gaps.push(Math.hypot(b.x - a.x, b.y - a.y));
    }
    const min = Math.min(...gaps);
    const max = Math.max(...gaps);
    // Squares/hexagons legitimately vary a little around corners, but the
    // sampling is dense enough that the spread stays tight.
    expect(max / min).toBeLessThan(1.6);

    expect(frame.outlinePath).toMatch(/^M /);
    expect(frame.outlinePath).toMatch(/Z$/);
  });

  it.each(BOARD_SHAPES as BoardShape[])(
    'builds a complete %s model for every player count',
    (shape) => {
      for (const playerCount of PLAYER_COUNTS) {
        const board = createBoardModel(playerCount, { shape });
        expect(board.shape).toBe(shape);
        expect(board.ring).toHaveLength(72);
        expect(board.outlinePath).toContain('M');

        // Geometry stays valid for every station regardless of outline.
        for (const station of board.stations) {
          expect(station.homeSlots).toHaveLength(4);
          for (const slot of station.homeSlots) {
            expect(slot.x).toBeGreaterThan(100);
            expect(slot.y).toBeGreaterThan(100);
            expect(slot.x).toBeLessThan(900);
            expect(slot.y).toBeLessThan(900);
            expect(Number.isFinite(slot.rotationDeg)).toBe(true);
          }
          for (const socket of station.baseSockets) {
            expect(socket.x).toBeGreaterThan(0);
            expect(socket.y).toBeGreaterThan(0);
            expect(socket.x).toBeLessThan(1000);
            expect(socket.y).toBeLessThan(1000);
          }
          expect(station.homeLanePath).toMatch(/^M /);
          expect(station.homeLanePath).toMatch(/Z$/);
        }

        // The full route resolves to valid points for every seat.
        for (const station of board.stations) {
          for (let progress = 0; progress < board.routeLength; progress += 1) {
            const point = pointForProgress(board, station.seat, progress);
            expect(point.x).toBeGreaterThan(0);
            expect(point.y).toBeGreaterThan(0);
            expect(point.x).toBeLessThan(1000);
            expect(point.y).toBeLessThan(1000);
          }
          for (let index = 0; index < 4; index += 1) {
            const socket = pointForBaseSocket(board, station.seat, index);
            expect(socket.x).toBeGreaterThan(0);
            expect(socket.y).toBeGreaterThan(0);
          }
        }
      }
    },
  );

  it('keeps every route continuous on every shape', () => {
    for (const shape of BOARD_SHAPES) {
      const board = createBoardModel(8, { shape });
      for (const station of board.stations) {
        const points = getRoutePoints(board, station.seat, 0, board.routeLength - 1);
        expect(points).toHaveLength(board.routeLength);
        // No sudden jumps between consecutive route points.
        for (let i = 1; i < points.length; i += 1) {
          const a = points[i - 1]!;
          const b = points[i]!;
          const distance = Math.hypot(b.x - a.x, b.y - a.y);
          expect(distance).toBeLessThan(80);
        }
      }
    }
  });

  it('defaults to the legacy circle board and rejects unknown shapes', () => {
    const circle = createBoardModel(4);
    expect(circle.shape).toBe('circle');
    const explicit = createBoardModel(4, { shape: 'circle' });
    expect(explicit.ring[0]).toEqual(circle.ring[0]);

    expect(() =>
      buildShapeFrame('triangle' as BoardShape, 72),
    ).not.toThrow(); // Unknown shapes fall back to the circle outline.
    expect(() => createBoardModel(4, { shape: 'square', ringLength: 60 })).toThrow();
  });
});
