import { describe, expect, it } from 'vitest';
import {
  createBoardModel,
  getRoutePoints,
  getStation,
  pointForProgress,
  progressForRingCell,
  ringCellForProgress,
} from '../src';

const PLAYER_COUNTS = [4, 6, 8] as const;

describe('board geometry', () => {
  it.each(PLAYER_COUNTS)('creates %i evenly spaced, unique start cells', (playerCount) => {
    const board = createBoardModel(playerCount);
    expect(board.starts).toHaveLength(playerCount);
    expect(new Set(board.starts).size).toBe(playerCount);
    expect(board.starts[0]).toBe(0);
    const spacing = board.ringLength / playerCount;
    board.starts.forEach((start, seat) => {
      expect(start).toBe(seat * spacing);
      expect(board.ring[start]?.isStart).toBe(true);
      expect(board.ring[start]?.startSeat).toBe(seat);
    });
  });

  it.each(PLAYER_COUNTS)('assigns teammates to opposite seats for %i players', (playerCount) => {
    const board = createBoardModel(playerCount);
    for (const station of board.stations) {
      const teammate = board.stations.find(
        (other) => other.teamId === station.teamId && other.seat !== station.seat,
      );
      expect(teammate).toBeDefined();
      const seatDistance = Math.abs(station.seat - (teammate?.seat ?? 0));
      expect(seatDistance).toBe(playerCount / 2);
    }
  });

  it.each(PLAYER_COUNTS)('marks starts, neutral stars and homes safe for %i', (playerCount) => {
    const board = createBoardModel(playerCount);
    for (const start of board.starts) {
      expect(board.ring[start]?.isSafe).toBe(true);
    }
    for (const safe of [9, 27, 45, 63]) {
      if (safe < board.ringLength) expect(board.ring[safe]?.isSafe).toBe(true);
    }
    for (const station of board.stations) {
      expect(station.homeSlots).toHaveLength(4);
      for (const slot of station.homeSlots) {
        expect(slot.x).toBeGreaterThan(0);
        expect(slot.y).toBeGreaterThan(0);
        expect(slot.x).toBeLessThan(1000);
        expect(slot.y).toBeLessThan(1000);
      }
    }
  });

  it('produces a complete, continuous route for each seat', () => {
    const board = createBoardModel(8);
    for (const station of board.stations) {
      const points = getRoutePoints(board, station.seat, 0, board.routeLength - 1);
      expect(points).toHaveLength(board.routeLength);
      const gate = board.ring[station.homeGateIndex]!;
      const finalHome = station.homeSlots[3]!;
      expect(points[0]).toEqual({ x: station.start.x, y: station.start.y });
      expect(points[board.ringLength - 1]).toEqual({ x: gate.x, y: gate.y });
      expect(points[board.routeLength - 1]).toEqual({ x: finalHome.x, y: finalHome.y });
    }
  });

  it('maps ring cells to owner-relative progress both ways', () => {
    const board = createBoardModel(6);
    for (const station of board.stations) {
      for (let progress = 0; progress < board.ringLength; progress += 1) {
        const cell = ringCellForProgress(board, station.seat, progress);
        expect(progressForRingCell(board, station.seat, cell)).toBe(progress);
      }
    }
  });

  it.each(PLAYER_COUNTS)('keeps every route point within the viewBox for %i', (playerCount) => {
    const board = createBoardModel(playerCount);
    for (const station of board.stations) {
      for (let progress = 0; progress < board.routeLength; progress += 1) {
        const point = pointForProgress(board, station.seat, progress);
        expect(point.x).toBeGreaterThan(0);
        expect(point.y).toBeGreaterThan(0);
        expect(point.x).toBeLessThan(1000);
        expect(point.y).toBeLessThan(1000);
      }
      for (const socket of station.baseSockets) {
        expect(socket.x).toBeGreaterThan(0);
        expect(socket.x).toBeLessThan(1000);
        expect(socket.y).toBeGreaterThan(0);
        expect(socket.y).toBeLessThan(1000);
      }
    }
    expect(getStation(board, 0).startIndex).toBe(0);
  });

  it('returns the same cached model for identical configuration', () => {
    const a = createBoardModel(4);
    const b = createBoardModel(4);
    expect(a).toBe(b);
  });

  it('throws for unsupported table sizes', () => {
    expect(() => createBoardModel(5 as never)).toThrow();
  });
});
