import type { BoardModel, Point } from './index';
import type { PublicPlayerState } from '@jackaroo/game-types';

export interface RenderMarble {
  id: string;
  ownerId: string;
  ownerName: string;
  seat: number;
  teamId: number;
  index: number;
  status: 'base' | 'board' | 'home';
  progress: number | null;
  x: number;
  y: number;
  radius: number;
  pointKey: string;
  stackCount: number;
}

interface RawMarble extends Omit<RenderMarble, 'x' | 'y' | 'radius' | 'pointKey' | 'stackCount'> {
  point: Point;
}

/**
 * Converts authoritative marble state into stable, stack-aware positions.
 * The same layout is used by the SVG layer and hit targets, so visual and
 * interactive positions can never drift apart.
 */
export function buildMarbleLayout(
  players: PublicPlayerState[],
  board: BoardModel,
): RenderMarble[] {
  const raw: RawMarble[] = [];

  for (const player of players) {
    const station = board.stations[player.seat];
    if (!station) continue;
    for (const marble of player.marbles) {
      const base: Omit<RawMarble, 'point'> = {
        ...marble,
        ownerId: player.id,
        ownerName: player.name,
        seat: player.seat,
        teamId: player.teamId,
      };
      if (marble.status === 'base' || marble.progress === null) {
        raw.push({
          ...base,
          point: pointForBase(board, player.seat, marble.index),
        });
      } else {
        raw.push({
          ...base,
          point: pointForRoute(board, player.seat, marble.progress),
        });
      }
    }
  }

  const groups = new Map<string, RawMarble[]>();
  for (const marble of raw) {
    const key = `${marble.point.x.toFixed(1)}:${marble.point.y.toFixed(1)}`;
    const list = groups.get(key) ?? [];
    list.push(marble);
    groups.set(key, list);
  }

  const output: RenderMarble[] = [];
  for (const [pointKey, list] of groups) {
    const count = list.length;
    const orbit = count === 1 ? 0 : count === 2 ? 8.5 : count === 3 ? 9 : count <= 5 ? 10 : 11.5;
    const radius =
      count === 1 ? 14 : count === 2 ? 10.8 : count === 3 ? 9.8 : count <= 5 ? 8.8 : 7.4;
    const sorted = [...list].sort((a, b) => a.seat - b.seat || a.index - b.index);
    sorted.forEach((marble, index) => {
      const angle = count <= 1 ? 0 : -Math.PI / 2 + (index * Math.PI * 2) / Math.max(2, count);
      output.push({
        id: marble.id,
        ownerId: marble.ownerId,
        ownerName: marble.ownerName,
        seat: marble.seat,
        teamId: marble.teamId,
        index: marble.index,
        status: marble.status,
        progress: marble.progress,
        x: round(marble.point.x + Math.cos(angle) * orbit),
        y: round(marble.point.y + Math.sin(angle) * orbit),
        radius,
        pointKey,
        stackCount: count,
      });
    });
  }

  return output.sort((a, b) => a.y - b.y || a.seat - b.seat || a.index - b.index);
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function pointForBase(board: BoardModel, seat: number, index: number): Point {
  const station = board.stations[seat];
  const socket = station?.baseSockets[index];
  if (!socket) throw new Error(`No base socket ${index} for seat ${seat}`);
  return socket;
}

function pointForRoute(board: BoardModel, seat: number, progress: number): Point {
  const station = board.stations[seat];
  if (!station) throw new Error(`No station for seat ${seat}`);
  if (progress < 0 || progress >= board.routeLength) {
    throw new Error(`Progress ${progress} is outside the route for seat ${seat}`);
  }
  if (progress < board.ringLength) {
    const cellIndex = (station.startIndex + progress) % board.ringLength;
    const cell = board.ring[cellIndex];
    if (!cell) throw new Error(`No ring cell ${cellIndex}`);
    return { x: cell.x, y: cell.y };
  }
  const slot = station.homeSlots[progress - board.ringLength];
  if (!slot) throw new Error(`No home slot for progress ${progress}`);
  return { x: slot.x, y: slot.y };
}
