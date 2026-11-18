'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { createBoardModel, pointForBaseSocket, pointForProgress } from '@jackaroo/game-board';
import { getTeamPalette } from '@jackaroo/game-config';
import type { PlayerCount } from '@jackaroo/game-types';
import { BoardBase } from './board-base';
import { PlayingCard } from '@/components/game/playing-card';
import { cn, initials } from '@/lib/utils';

interface BoardPreviewProps {
  playerCount?: PlayerCount;
  className?: string;
}

const SAMPLE_CARDS = [
  { id: 'Ad', rank: 'A', suit: 'diamonds' },
  { id: 'Qh', rank: 'Q', suit: 'hearts' },
  { id: '7s', rank: '7', suit: 'spades' },
] as const;

const PLAYER_NAMES = ['Amara', 'Theo', 'June', 'Milo', 'Sana', 'Rafi', 'Noa', 'Eli'];

/**
 * Decorative board art for the landing page. It shares the geometry with the
 * live game but renders a fixed, non-interactive scene — it is never a fake
 * playable match.
 */
export function BoardPreview({ playerCount = 4, className }: BoardPreviewProps) {
  const rawId = React.useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const board = React.useMemo(() => createBoardModel(playerCount), [playerCount]);

  const marbles = React.useMemo(() => {
    const result: Array<{ key: string; x: number; y: number; teamId: number; radius: number }> = [];
    const progressBySeat = [11, 7, 29, 19, 35, 23, 41, 31];
    const homeBySeat = [2, 0, 3, 1, 0, 2, 1, 3];
    board.stations.forEach((station) => {
      const baseA = pointForBaseSocket(board, station.seat, 0);
      const baseB = pointForBaseSocket(board, station.seat, 1);
      const onBoard = pointForProgress(board, station.seat, progressBySeat[station.seat] ?? 8);
      const inHome = station.homeSlots[homeBySeat[station.seat] ?? 0]!;
      result.push(
        { key: `${station.seat}-b1`, x: baseA.x, y: baseA.y, teamId: station.teamId, radius: 12 },
        { key: `${station.seat}-b2`, x: baseB.x, y: baseB.y, teamId: station.teamId, radius: 12 },
        { key: `${station.seat}-r`, x: onBoard.x, y: onBoard.y, teamId: station.teamId, radius: 13.5 },
        { key: `${station.seat}-h`, x: inHome.x, y: inHome.y, teamId: station.teamId, radius: 11 },
      );
    });
    return result;
  }, [board]);

  return (
    <div className={cn('relative aspect-square w-full', className)}>
      <div className="pointer-events-none absolute inset-[8%] rounded-full bg-gold/10 blur-3xl" />
      <div className="animate-float-slower absolute inset-[5%]">
        <BoardBase
          board={board}
          className="absolute inset-0 h-full w-full drop-shadow-[0_55px_90px_rgba(0,0,0,0.65)]"
        />
        <svg
          viewBox="0 0 1000 1000"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            {Array.from({ length: board.teamCount }, (_, teamId) => {
              const team = getTeamPalette(teamId);
              return (
                <radialGradient key={teamId} id={`${id}-sm-${teamId}`} cx="32%" cy="25%" r="80%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
                  <stop offset="18%" stopColor={team.pale} />
                  <stop offset="48%" stopColor={team.primary} />
                  <stop offset="100%" stopColor={team.deep} />
                </radialGradient>
              );
            })}
          </defs>
          {marbles.map((marble) => {
            const team = getTeamPalette(marble.teamId);
            return (
              <g key={marble.key} transform={`translate(${marble.x} ${marble.y})`}>
                <ellipse cy={marble.radius * 0.55} rx={marble.radius * 0.92} ry={marble.radius * 0.4} fill="#000" opacity="0.4" />
                <circle r={marble.radius} fill={`url(#${id}-sm-${marble.teamId})`} stroke={team.deep} strokeWidth="0.9" />
                <circle r={marble.radius - 1.3} fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.7" />
                <circle cy={-marble.radius * 0.38} cx={-marble.radius * 0.34} r={marble.radius * 0.24} fill="#fff" opacity="0.6" />
              </g>
            );
          })}
        </svg>

        <div className="absolute inset-0 hidden text-cream sm:block">
          {board.stations.slice(0, 4).map((station) => {
            const team = getTeamPalette(station.teamId);
            return (
              <div
                key={station.seat}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-[#051611]/90 py-1 pl-1 pr-2.5 shadow-xl backdrop-blur"
                style={{
                  left: `${(station.seatAnchor.x / 1000) * 100}%`,
                  top: `${(station.seatAnchor.y / 1000) * 100}%`,
                }}
              >
                <span
                  className="flex size-6 items-center justify-center rounded-full text-[8px] font-bold"
                  style={{ backgroundColor: team.deep, border: `1px solid ${team.primary}88`, color: team.pale }}
                >
                  {initials(PLAYER_NAMES[station.seat] ?? 'P')}
                </span>
                <span className="text-[9px] font-medium text-cream/75">
                  {PLAYER_NAMES[station.seat]}
                </span>
                {station.seat === 0 ? (
                  <span className="rounded-full bg-gold px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-ink">
                    You
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <motion.div
        className="absolute -right-2 bottom-[14%] flex items-end sm:-right-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {SAMPLE_CARDS.map((card, index) => (
          <PlayingCard
            key={card.id}
            card={card}
            size="sm"
            asButton={false}
            className={index === 2 ? 'ml-2 -rotate-6 sm:ml-3' : index === 1 ? '-ml-4 -rotate-2' : '-ml-4 rotate-3'}
            style={{ zIndex: index }}
          />
        ))}
      </motion.div>

      <motion.div
        className="absolute -left-1 top-[16%] flex items-center gap-2 rounded-full border border-gold/30 bg-[#04140f]/90 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-gold-bright shadow-2xl backdrop-blur sm:-left-3"
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        Amara&apos;s turn
      </motion.div>
    </div>
  );
}
