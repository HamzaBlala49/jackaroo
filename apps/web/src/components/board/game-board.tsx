'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import {
  createBoardModel,
  getRoutePoints,
  pointForProgress,
  type BoardModel,
} from '@jackaroo/game-board';
import { getTeamPalette } from '@jackaroo/game-config';
import type { GameSnapshot } from '@jackaroo/game-types';
import { Crown, Layers2, WifiOff } from 'lucide-react';
import { BoardBase } from './board-base';
import { buildMarbleLayout, type RenderMarble } from './marble-layout';
import { cn, initials } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings-store';

export type BoardPreview =
  | { kind: 'move'; marbleId: string; toProgress: number }
  | { kind: 'enter'; marbleId: string }
  | { kind: 'swap'; marbleId: string; targetMarbleId: string };

interface GameBoardProps {
  snapshot: GameSnapshot;
  sourceMarbleIds?: string[];
  enterMarbleIds?: string[];
  targetMarbleIds?: string[];
  focusedMarbleId?: string | null;
  preview?: BoardPreview | null;
  onMarbleClick?: (marbleId: string) => void;
  onMarbleHover?: (marbleId: string | null) => void;
  disabled?: boolean;
  showSeatChips?: boolean;
  className?: string;
}

export function GameBoard({
  snapshot,
  sourceMarbleIds = [],
  enterMarbleIds = [],
  targetMarbleIds = [],
  focusedMarbleId = null,
  preview = null,
  onMarbleClick,
  onMarbleHover,
  disabled = false,
  showSeatChips = true,
  className,
}: GameBoardProps) {
  const rawId = React.useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);

  const board = React.useMemo(
    () =>
      createBoardModel(snapshot.playerCount, {
        ringLength: snapshot.rules.ringLength,
        homeLaneLength: snapshot.rules.homeLaneLength,
        safePositions: snapshot.rules.safePositions,
      }),
    [
      snapshot.playerCount,
      snapshot.rules.homeLaneLength,
      snapshot.rules.ringLength,
      snapshot.rules.safePositions,
    ],
  );
  const layout = React.useMemo(
    () => buildMarbleLayout(snapshot.players, board),
    [board, snapshot.players],
  );
  const marbleById = React.useMemo(
    () => new Map(layout.map((marble) => [marble.id, marble])),
    [layout],
  );

  const sourceSet = React.useMemo(() => new Set(sourceMarbleIds), [sourceMarbleIds]);
  const enterSet = React.useMemo(() => new Set(enterMarbleIds), [enterMarbleIds]);
  const targetSet = React.useMemo(() => new Set(targetMarbleIds), [targetMarbleIds]);
  const activeSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const value of sourceMarbleIds) set.add(value);
    for (const value of enterMarbleIds) set.add(value);
    for (const value of targetMarbleIds) set.add(value);
    return set;
  }, [enterMarbleIds, sourceMarbleIds, targetMarbleIds]);

  const previewVisual = React.useMemo(
    () => buildPreview(preview, board, marbleById),
    [board, marbleById, preview],
  );

  const currentPlayer = snapshot.currentPlayerId
    ? snapshot.players.find((player) => player.id === snapshot.currentPlayerId)
    : undefined;
  const currentTeam = currentPlayer ? getTeamPalette(currentPlayer.teamId) : null;

  interface HitTarget {
    marble: RenderMarble;
    x: number;
    y: number;
    size: number;
    label: string;
  }

  const interactive = React.useMemo<HitTarget[]>(() => {
    if (disabled) return [];
    const byKey = new Map<string, HitTarget>();
    for (const marble of layout) {
      if (!activeSet.has(marble.id)) continue;
      const isBaseEnter = enterSet.has(marble.id) && marble.status === 'base';
      const station = board.stations[marble.seat];
      const key = isBaseEnter ? `base:${marble.ownerId}` : marble.pointKey;
      const role = targetSet.has(marble.id)
        ? 'opponent target'
        : isBaseEnter
          ? 'base to enter a marble'
          : 'marble';
      const target: HitTarget = {
        marble,
        x: isBaseEnter && station ? station.baseCenter.x : marble.x,
        y: isBaseEnter && station ? station.baseCenter.y : marble.y,
        size: isBaseEnter ? 72 : 44,
        label: `Select ${marble.ownerName}'s ${role}`,
      };
      const existing = byKey.get(key);
      if (!existing || (focusedMarbleId && marble.id === focusedMarbleId)) {
        byKey.set(key, target);
      }
    }
    return [...byKey.values()];
  }, [activeSet, board.stations, disabled, enterSet, focusedMarbleId, layout, targetSet]);

  return (
    <div className={cn('relative aspect-square w-full select-none', className)}>
      <BoardBase
        board={board}
        className="absolute inset-0 h-full w-full drop-shadow-[0_35px_60px_rgba(0,0,0,0.55)]"
      />

      <svg
        viewBox="0 0 1000 1000"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-label={`Jackaroo board with ${snapshot.playerCount} players`}
        role="img"
      >
        <defs>
          {Array.from({ length: board.teamCount }, (_, teamId) => {
            const team = getTeamPalette(teamId);
            return (
              <radialGradient
                key={teamId}
                id={`${id}-m-${teamId}`}
                cx="32%"
                cy="25%"
                r="80%"
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="17%" stopColor={team.pale} />
                <stop offset="48%" stopColor={team.primary} />
                <stop offset="100%" stopColor={team.deep} />
              </radialGradient>
            );
          })}
        </defs>

        {currentTeam ? (
          <circle
            cx="500"
            cy="500"
            r="126"
            fill="none"
            stroke={currentTeam.primary}
            strokeWidth="2"
            strokeDasharray="4 12"
            opacity="0.5"
            className="origin-center animate-[spin_45s_linear_infinite]"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        ) : null}
        {Array.from(enterSet).map((marbleId) => {
          const marble = marbleById.get(marbleId);
          if (!marble || marble.status !== 'base') return null;
          const station = board.stations[marble.seat];
          if (!station) return null;
          return (
            <g key={`enter-base-${marble.ownerId}`}>
              <circle
                cx={station.baseCenter.x}
                cy={station.baseCenter.y}
                r="52"
                fill="none"
                stroke="#f4d79c"
                strokeWidth="2"
                strokeDasharray="3 7"
                opacity="0.9"
                className="animate-pulse"
              />
              <circle
                cx={station.baseCenter.x}
                cy={station.baseCenter.y}
                r="48"
                fill="#f4d79c"
                opacity="0.05"
              />
            </g>
          );
        })}

        {currentPlayer ? (() => {
          const station = board.stations[currentPlayer.seat];
          if (!station) return null;
          const palette = getTeamPalette(currentPlayer.teamId);
          return (
            <g>
              <circle
                cx={station.baseCenter.x}
                cy={station.baseCenter.y}
                r="51"
                fill="none"
                stroke={palette.primary}
                strokeWidth="1.4"
                strokeDasharray="3 7"
                opacity="0.75"
                className="animate-pulse"
              />
              <circle cx={station.baseCenter.x} cy={station.baseCenter.y} r="47" fill={palette.primary} opacity="0.045" />
            </g>
          );
        })() : null}

        {/* legal source halos */}
        {layout.map((marble) => {
          const isSource = sourceSet.has(marble.id);
          const isEnter = enterSet.has(marble.id);
          const isTarget = targetSet.has(marble.id);
          const isFocused = focusedMarbleId === marble.id;
          if (!isSource && !isEnter && !isTarget) return null;
          const team = getTeamPalette(marble.teamId);
          const color = isTarget ? '#f4c9d4' : '#f4d79c';
          return (
            <g key={`halo-${marble.id}`} style={{ filter: 'drop-shadow(0 0 5px rgba(244,215,156,0.55))' }}>
              <circle
                cx={marble.x}
                cy={marble.y}
                r={marble.radius + (isFocused ? 10 : 8)}
                fill="none"
                stroke="#04120f"
                strokeWidth={isFocused ? 5.5 : 4.5}
                opacity="0.85"
              />
              <circle
                cx={marble.x}
                cy={marble.y}
                r={marble.radius + (isFocused ? 9 : 7)}
                fill={isTarget ? 'none' : 'rgba(244,215,156,0.08)'}
                stroke={color}
                strokeWidth={isFocused ? 2.8 : 2}
                strokeDasharray={isTarget ? '2 4' : isFocused ? undefined : '3 5'}
                opacity={isFocused ? 1 : 0.9}
                className={isFocused ? undefined : 'animate-pulse'}
              />
              {isFocused ? (
                <circle
                  cx={marble.x}
                  cy={marble.y}
                  r={marble.radius + 14}
                  fill={team.primary}
                  opacity="0.12"
                />
              ) : null}
              {isTarget ? (
                <>
                  <circle cx={marble.x} cy={marble.y} r={marble.radius + 12} fill="none" stroke="#f7e6c5" strokeOpacity="0.25" strokeWidth="0.8" />
                  <path
                    d={`M ${marble.x - 16} ${marble.y} h 5 M ${marble.x + 11} ${marble.y} h 5 M ${marble.x} ${marble.y - 16} v 5 M ${marble.x} ${marble.y + 11} v 5`}
                    stroke="#f7e6c5"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                </>
              ) : null}
            </g>
          );
        })}

        {/* legal destination preview */}
        {previewVisual ? (
          <g>
            {previewVisual.path ? (
              <>
                <path
                  d={previewVisual.path}
                  fill="none"
                  stroke="#041712"
                  strokeWidth="5"
                  opacity="0.55"
                  strokeLinecap="round"
                />
                <path
                  d={previewVisual.path}
                  fill="none"
                  stroke="#f0d39b"
                  strokeWidth="2"
                  strokeDasharray="2 7"
                  strokeLinecap="round"
                  opacity="0.95"
                />
              </>
            ) : null}
            <g transform={`translate(${previewVisual.x} ${previewVisual.y})`}>
              <circle r="22" fill="none" stroke="#f3d9a1" strokeWidth="1" strokeDasharray="2 5" opacity="0.7" className="animate-pulse" />
              <circle r="12" fill="#f3d9a1" opacity="0.18" stroke="#f5dfae" strokeWidth="1.2" />
              <path d="M0 -5 L1.3 -1.3 5 0 1.3 1.3 0 5 -1.3 1.3 -5 0 -1.3 -1.3 Z" fill="#f7e6c3" />
            </g>
            <circle
              cx={previewVisual.source.x}
              cy={previewVisual.source.y}
              r={previewVisual.source.radius + 11}
              fill="none"
              stroke="#f4dcab"
              strokeWidth="1"
              opacity="0.5"
            />
          </g>
        ) : null}

        {/* marbles */}
        {layout.map((marble) => {
          const team = getTeamPalette(marble.teamId);
          const isFocused = focusedMarbleId === marble.id;
          return (
            <motion.g
              key={marble.id}
              initial={false}
              animate={{ x: marble.x, y: marble.y }}
              transition={
                animationsEnabled
                  ? { type: 'spring', stiffness: 190, damping: 24, mass: 0.75 }
                  : { duration: 0 }
              }
            >
              <ellipse
                cx="0"
                cy={marble.radius * 0.56}
                rx={marble.radius * 0.9}
                ry={marble.radius * 0.42}
                fill="#000"
                opacity="0.38"
              />
              <circle
                r={marble.radius}
                fill={`url(#${id}-m-${marble.teamId})`}
                stroke={team.deep}
                strokeWidth="0.9"
              />
              <circle
                r={marble.radius - 1.4}
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.18"
                strokeWidth="0.7"
              />
              <circle
                cx={-marble.radius * 0.33}
                cy={-marble.radius * 0.38}
                r={Math.max(1.8, marble.radius * 0.23)}
                fill="#ffffff"
                opacity="0.6"
              />
              {isFocused ? (
                <circle r={marble.radius + 2.4} fill="none" stroke="#f8e7c2" strokeWidth="1.1" opacity="0.9" />
              ) : null}
            </motion.g>
          );
        })}

      </svg>

      {/* DOM hit targets are fixed at 44px, independent of SVG scale. */}
      {interactive.length > 0 ? (
        <div className="absolute inset-0 z-20">
          {interactive.map((target) => (
            <button
              key={`${target.marble.id}-${target.x}`}
              type="button"
              disabled={disabled}
              aria-label={target.label}
              className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-felt-deep"
              style={{
                position: 'absolute',
                left: `${(target.x / 1000) * 100}%`,
                top: `${(target.y / 1000) * 100}%`,
                width: target.size,
                height: target.size,
              }}
              onClick={() => onMarbleClick?.(target.marble.id)}
              onPointerEnter={() => onMarbleHover?.(target.marble.id)}
              onPointerLeave={() => onMarbleHover?.(null)}
              onFocus={() => onMarbleHover?.(target.marble.id)}
              onBlur={() => onMarbleHover?.(null)}
            />
          ))}
        </div>
      ) : null}

      {showSeatChips ? (
        <SeatChips snapshot={snapshot} board={board} />
      ) : null}
    </div>
  );
}

function SeatChips({ snapshot, board }: { snapshot: GameSnapshot; board: BoardModel }) {
  const compactChips = snapshot.playerCount >= 8;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 hidden xl:block">
      {snapshot.players.map((player) => {
        const station = board.stations[player.seat];
        if (!station) return null;
        const team = getTeamPalette(player.teamId);
        const connected = snapshot.presence[player.id] ?? false;
        const current = snapshot.currentPlayerId === player.id;
        const isYou = snapshot.you?.playerId === player.id;
        return (
          <div
            key={player.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(station.seatAnchor.x / 1000) * 100}%`,
              top: `${(station.seatAnchor.y / 1000) * 100}%`,
            }}
          >
            <div
              title={`${player.name} · ${player.handCount} cards${player.finished ? ' · home' : ''}`}
              className={cn(
                'flex items-center gap-2 rounded-full border bg-[#04120e]/88 py-1 pl-1 pr-2.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all',
                current ? 'scale-105' : 'opacity-85',
                player.finished && 'opacity-70',
                compactChips && 'gap-0 px-1 py-1',
              )}
              style={{
                borderColor: current ? team.primary : 'rgba(255,255,255,0.1)',
                boxShadow: current ? `0 0 24px ${team.glow}` : undefined,
              }}
            >
              <span
                className="relative flex size-8 items-center justify-center rounded-full text-[10px] font-bold tracking-wide"
                style={{
                  backgroundColor: `${team.deep}`,
                  border: `1px solid ${team.primary}88`,
                  color: team.pale,
                }}
              >
                {initials(player.name)}
                {connected ? (
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#04120e] bg-emerald-400" />
                ) : (
                  <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border border-[#04120e] bg-[#2a2a28]">
                    <WifiOff className="size-2.5 text-cream/60" />
                  </span>
                )}
              </span>
              {compactChips ? (
                <span className="flex items-center gap-1 pr-0.5">
                  <span className="text-[9px] font-semibold text-cream/60">{player.handCount}</span>
                  {player.finished ? <Crown className="size-2.5 text-gold" /> : null}
                </span>
              ) : (
                <span className="flex max-w-28 flex-col gap-0.5">
                  <span className="truncate text-[11px] font-semibold leading-none text-cream/90">
                    {player.name}
                    {isYou ? <span className="ml-1 text-gold">· you</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-cream/40">
                    <Layers2 className="size-2.5" />
                    {player.handCount}
                    {player.finished ? (
                      <span className="flex items-center gap-0.5 text-gold">
                        <Crown className="size-2.5" />
                        home
                      </span>
                    ) : null}
                  </span>
                </span>
              )}
              {current ? (
                <span
                  className="ml-0.5 size-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: team.primary, boxShadow: `0 0 8px ${team.primary}` }}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PreviewVisual {
  x: number;
  y: number;
  path: string | null;
  source: RenderMarble;
}

function buildPreview(
  preview: BoardPreview | null,
  board: BoardModel,
  marbleById: Map<string, RenderMarble>,
): PreviewVisual | null {
  if (!preview) return null;
  const source = marbleById.get(preview.marbleId);
  if (!source) return null;

  if (preview.kind === 'enter') {
    const station = board.stations[source.seat];
    if (!station) return null;
    const controlX = (source.x + station.start.x) / 2 + (source.x - station.start.x) * 0.18;
    const controlY = (source.y + station.start.y) / 2 + (source.y - station.start.y) * 0.18;
    return {
      x: station.start.x,
      y: station.start.y,
      path: `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${station.start.x} ${station.start.y}`,
      source,
    };
  }

  if (preview.kind === 'swap') {
    const target = marbleById.get(preview.targetMarbleId);
    if (!target) return null;
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const offset = Math.min(80, length * 0.18);
    const controlX = midX - (dy / length) * offset;
    const controlY = midY + (dx / length) * offset;
    return {
      x: target.x,
      y: target.y,
      path: `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`,
      source,
    };
  }

  if (source.progress === null) return null;
  const destination = pointForProgress(board, source.seat, preview.toProgress);
  const points = getRoutePoints(board, source.seat, source.progress, preview.toProgress);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  return { x: destination.x, y: destination.y, path, source };
}
