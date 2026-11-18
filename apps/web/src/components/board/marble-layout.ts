import {
  pointForBaseSocket,
  pointForProgress,
  type BoardModel,
} from '@jackaroo/game-board';
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
  point: { x: number; y: number };
}

/**
 * Converts authoritative marble state into stable, stack-aware SVG positions.
 * The same layout is used by the SVG layer and the DOM hit targets, so visual
 * and interactive positions can never drift apart.
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
      if (marble.status === 'base' || marble.progress === null) {
        raw.push({
          ...marble,
          ownerId: player.id,
          ownerName: player.name,
          seat: player.seat,
          teamId: player.teamId,
          point: pointForBaseSocket(board, player.seat, marble.index),
        });
      } else {
        raw.push({
          ...marble,
          ownerId: player.id,
          ownerName: player.name,
          seat: player.seat,
          teamId: player.teamId,
          point: pointForProgress(board, player.seat, marble.progress),
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
      const angle =
        count <= 1 ? 0 : -Math.PI / 2 + (index * Math.PI * 2) / Math.max(2, count);
      output.push({
        id: marble.id,
        ownerId: marble.ownerId,
        ownerName: marble.ownerName,
        seat: marble.seat,
        teamId: marble.teamId,
        index: marble.index,
        status: marble.status,
        progress: marble.progress,
        x: marble.point.x + Math.cos(angle) * orbit,
        y: marble.point.y + Math.sin(angle) * orbit,
        radius,
        pointKey,
        stackCount: count,
      });
    });
  }

  return output.sort((a, b) => a.y - b.y || a.seat - b.seat || a.index - b.index);
}
