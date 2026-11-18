'use client';

import * as React from 'react';
import type { BoardModel } from '@jackaroo/game-board';
import { getTeamPalette } from '@jackaroo/game-config';

interface BoardBaseProps {
  board: BoardModel;
  className?: string;
}

/**
 * The static, memoized board surface. No game state is baked in, so moving a
 * marble never re-renders the 72-cell track, home lanes or wooden rim.
 */
export const BoardBase = React.memo(function BoardBase({ board, className }: BoardBaseProps) {
  const rawId = React.useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const teams = React.useMemo(
    () => Array.from({ length: board.teamCount }, (_, index) => getTeamPalette(index)),
    [board.teamCount],
  );

  const studs = React.useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const angle = (index * Math.PI * 2) / 24;
        return {
          x: Math.round((500 + Math.cos(angle) * 485) * 10_000) / 10_000,
          y: Math.round((500 + Math.sin(angle) * 485) * 10_000) / 10_000,
        };
      }),
    [],
  );

  return (
    <svg
      viewBox="0 0 1000 1000"
      className={className}
      aria-hidden
      focusable="false"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`${id}-felt`} cx="42%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#16473b" />
          <stop offset="52%" stopColor="#0c2e25" />
          <stop offset="100%" stopColor="#051914" />
        </radialGradient>
        <radialGradient id={`${id}-feltLight`} cx="38%" cy="24%" r="55%">
          <stop offset="0%" stopColor="#2b6b58" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0b2a22" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-wood`} x1="18%" y1="0%" x2="82%" y2="100%">
          <stop offset="0%" stopColor="#7d5132" />
          <stop offset="18%" stopColor="#563520" />
          <stop offset="46%" stopColor="#6a4229" />
          <stop offset="68%" stopColor="#402414" />
          <stop offset="100%" stopColor="#6a422a" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7e1b0" />
          <stop offset="45%" stopColor="#d2a95e" />
          <stop offset="100%" stopColor="#8a6428" />
        </linearGradient>
        <radialGradient id={`${id}-darkMetal`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#2a3d32" />
          <stop offset="100%" stopColor="#081510" />
        </radialGradient>
        <pattern id={`${id}-speckle`} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="0.55" fill="#d7ebdf" opacity="0.08" />
          <circle cx="11" cy="9" r="0.4" fill="#d7ebdf" opacity="0.045" />
          <circle cx="7" cy="14" r="0.5" fill="#d7ebdf" opacity="0.045" />
        </pattern>
        <pattern id={`${id}-grain`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#f6d7a5" strokeOpacity="0.035" strokeWidth="0.6" />
        </pattern>
        {teams.map((team) => (
          <radialGradient
            key={team.id}
            id={`${id}-base-${team.id}`}
            cx="32%"
            cy="24%"
            r="85%"
          >
            <stop offset="0%" stopColor={team.primary} stopOpacity="0.95" />
            <stop offset="52%" stopColor={team.deep} stopOpacity="0.95" />
            <stop offset="100%" stopColor={team.ink} stopOpacity="0.98" />
          </radialGradient>
        ))}
        {teams.map((team) => (
          <radialGradient
            key={team.id}
            id={`${id}-marble-${team.id}`}
            cx="32%"
            cy="26%"
            r="80%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="18%" stopColor={team.pale} />
            <stop offset="48%" stopColor={team.primary} />
            <stop offset="100%" stopColor={team.deep} />
          </radialGradient>
        ))}
      </defs>

      {/* board body */}
      <circle cx="500" cy="500" r="499" fill="#020807" opacity="0.55" />
      <circle cx="500" cy="500" r="494" fill={`url(#${id}-wood)`} stroke="#1c1009" strokeWidth="4" />
      <circle cx="500" cy="500" r="493" fill={`url(#${id}-grain)`} opacity="0.8" />
      <circle cx="500" cy="500" r="482" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="2" opacity="0.75" />
      <circle cx="500" cy="500" r="476" fill="none" stroke="#1e1109" strokeWidth="7" opacity="0.55" />
      <circle cx="500" cy="500" r="470" fill="none" stroke="#e4c183" strokeWidth="0.8" opacity="0.32" />
      {studs.map((stud, index) => (
        <circle key={index} cx={stud.x} cy={stud.y} r={index % 2 === 0 ? 2.1 : 1.3} fill="#e8c88e" opacity="0.62" />
      ))}
      <circle cx="500" cy="500" r="462" fill="#041310" />
      <circle cx="500" cy="500" r="460" fill={`url(#${id}-felt)`} />
      <circle cx="500" cy="500" r="460" fill={`url(#${id}-feltLight)`} />
      <circle cx="500" cy="500" r="460" fill={`url(#${id}-speckle)`} />
      <circle cx="500" cy="500" r="459" fill="none" stroke="#c5a269" strokeWidth="1" opacity="0.24" />
      <circle cx="500" cy="500" r="454" fill="none" stroke="#020a08" strokeWidth="10" opacity="0.6" />

      {/* home lanes */}
      <g>
        {board.stations.map((station) => {
          const team = teams[station.teamId]!;
          return (
            <g key={`lane-${station.seat}`}>
              <path
                d={station.homeLanePath}
                fill={team.primary}
                fillOpacity="0.14"
                stroke={team.primary}
                strokeOpacity="0.3"
                strokeWidth="1"
              />
              <line
                x1={board.ring[station.homeGateIndex]?.x}
                y1={board.ring[station.homeGateIndex]?.y}
                x2={station.homeSlots[3]?.x}
                y2={station.homeSlots[3]?.y}
                stroke={team.primary}
                strokeOpacity="0.18"
                strokeWidth="0.8"
                strokeDasharray="2 5"
              />
            </g>
          );
        })}
      </g>

      {/* main ring track */}
      <g>
        <circle cx="500" cy="500" r="374" fill="none" stroke="#e1c184" strokeOpacity="0.11" strokeWidth="0.8" />
        <circle cx="500" cy="500" r="309" fill="none" stroke="#e1c184" strokeOpacity="0.09" strokeWidth="0.8" />
        {board.ring.map((cell) => {
          const isStart = cell.isStart;
          const team = cell.startSeat !== null ? teams[stationTeam(cell.startSeat, board.teamCount)] : null;
          const size = isStart ? 30 : 26;
          const fill = isStart
            ? team?.primary ?? '#173b31'
            : cell.isNeutralSafe
              ? '#f0e2c4'
              : cell.index % 2 === 0
                ? '#e9dcc0'
                : '#dccaa7';
          const stroke = isStart
            ? team?.primary ?? '#d8b36a'
            : cell.isNeutralSafe
              ? '#b78f47'
              : 'rgba(83,62,32,0.55)';
          return (
            <g
              key={cell.index}
              data-ring-index={cell.index}
              data-start={isStart ? 'true' : undefined}
              data-safe={cell.isSafe ? 'true' : undefined}
              transform={`translate(${cell.x} ${cell.y}) rotate(${cell.angleDeg + 90})`}
            >
              {isStart && team ? (
                <>
                  <circle r={23} fill={team.primary} opacity="0.12" />
                  <circle r={18} fill="none" stroke={team.primary} strokeWidth="1.4" opacity="0.7" />
                </>
              ) : null}
              <rect
                x={-size / 2}
                y={-size / 2}
                width={size}
                height={size}
                rx={isStart ? 8 : 6.5}
                fill={fill}
                stroke={stroke}
                strokeWidth={isStart ? 1.4 : 0.9}
              />
              <rect
                x={-size / 2 + 2.4}
                y={-size / 2 + 2.4}
                width={size - 4.8}
                height={size - 4.8}
                rx={4.5}
                fill="none"
                stroke={isStart ? '#f6e4bb' : '#fff'}
                strokeOpacity={isStart ? 0.42 : 0.16}
                strokeWidth="0.6"
              />
              {isStart || cell.isNeutralSafe ? (
                <path
                  d="M0 -7.4 L1.9 -1.9 7.4 0 1.9 1.9 0 7.4 -1.9 1.9 -7.4 0 -1.9 -1.9 Z"
                  fill={isStart ? '#fff6df' : '#9d742d'}
                  opacity={isStart ? 1 : 0.85}
                />
              ) : (
                <circle r="1.4" fill="#8c6b3b" opacity="0.33" />
              )}
            </g>
          );
        })}
      </g>

      {/* home slots */}
      <g>
        {board.stations.map((station) => {
          const team = teams[station.teamId]!;
          return (
            <g key={`home-${station.seat}`}>
              {station.homeSlots.map((slot) => (
                <g
                  key={slot.slot}
                  transform={`translate(${slot.x} ${slot.y}) rotate(${station.homeAngleDeg + 90})`}
                >
                  <rect
                    x={-14.5}
                    y={-14.5}
                    width="29"
                    height="29"
                    rx="7"
                    fill="#071b15"
                    stroke={team.primary}
                    strokeOpacity="0.82"
                    strokeWidth="1.2"
                  />
                  <rect
                    x={-10.5}
                    y={-10.5}
                    width="21"
                    height="21"
                    rx="5"
                    fill={team.primary}
                    fillOpacity="0.16"
                    stroke={team.primary}
                    strokeOpacity="0.35"
                    strokeWidth="0.7"
                  />
                  <circle r="2" fill={team.primary} opacity="0.36" />
                </g>
              ))}
              <g transform={`translate(${station.homeSlots[0]?.x} ${station.homeSlots[0]?.y}) rotate(${station.homeAngleDeg})`}>
                <path d="M0 -20 L0 -26" stroke={team.primary} strokeWidth="1" opacity="0.35" />
              </g>
            </g>
          );
        })}
      </g>

      {/* base docks */}
      <g>
        {board.stations.map((station) => {
          const team = teams[station.teamId]!;
          return (
            <g
              key={`base-${station.seat}`}
              transform={`translate(${station.baseCenter.x} ${station.baseCenter.y}) rotate(${station.baseAngleDeg + 90})`}
            >
              <circle r="39" fill={team.primary} opacity="0.08" />
              <rect
                x="-44"
                y="-34"
                width="88"
                height="68"
                rx="17"
                fill={`url(#${id}-base-${team.id})`}
                stroke={team.primary}
                strokeOpacity="0.55"
                strokeWidth="1.1"
              />
              <rect
                x="-39"
                y="-29"
                width="78"
                height="58"
                rx="13"
                fill="none"
                stroke="#f4e3bf"
                strokeOpacity="0.18"
                strokeWidth="0.8"
              />
              <path
                d="M0 -27 L3 -23 0 -19 -3 -23 Z"
                fill={`url(#${id}-gold)`}
                opacity="0.8"
              />
              {station.baseSockets.map((_, socketIndex) => {
                const column = socketIndex % 2;
                const row = Math.floor(socketIndex / 2);
                return (
                  <g key={socketIndex} transform={`translate(${column === 0 ? -18 : 18} ${row === 0 ? -14 : 14})`}>
                    <circle r="11.2" fill="#03100c" opacity="0.32" />
                    <circle r="9.8" fill="#061611" stroke="#f0d7a4" strokeOpacity="0.18" strokeWidth="0.8" />
                    <circle r="6.4" fill={team.deep} opacity="0.4" />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>

      {/* centre medallion */}
      <g>
        <circle cx="500" cy="500" r="120" fill="#04120e" stroke="#d7b272" strokeOpacity="0.5" strokeWidth="1.2" />
        <circle cx="500" cy="500" r="111" fill="#0a241c" stroke="#e3c98f" strokeOpacity="0.18" strokeWidth="0.8" />
        <circle cx="500" cy="500" r="104" fill="none" stroke="#d8b36a" strokeOpacity="0.15" strokeWidth="0.7" strokeDasharray="1 5" />
        <circle cx="500" cy="500" r="78" fill={`url(#${id}-darkMetal)`} stroke="#d8b36a" strokeOpacity="0.3" strokeWidth="0.9" />
        <g opacity="0.95">
          <path
            d="M500 421 L510 487 576 500 510 513 500 579 490 513 424 500 490 487 Z"
            fill={`url(#${id}-gold)`}
            opacity="0.92"
          />
          <path
            d="M500 453 L506 494 547 500 506 506 500 547 494 506 453 500 494 494 Z"
            fill="#092019"
            opacity="0.52"
          />
          <circle cx="500" cy="500" r="7.5" fill="#071a14" stroke="#e4c98f" strokeWidth="0.8" strokeOpacity="0.6" />
          <circle cx="500" cy="500" r="2.4" fill="#efd49c" />
        </g>
        <text
          x="500"
          y="562"
          textAnchor="middle"
          fill="#e8ce98"
          fontSize="8.5"
          letterSpacing="4.4"
          fontFamily="Georgia, serif"
          opacity="0.8"
        >
          JACKAROO
        </text>
        <text
          x="500"
          y="577"
          textAnchor="middle"
          fill="#d8b36a"
          fontSize="4.4"
          letterSpacing="3"
          fontFamily="system-ui, sans-serif"
          opacity="0.45"
        >
          A TABLE FOR FRIENDS
        </text>
      </g>

      {/* rim highlight */}
      <path
        d="M 156 317 A 420 420 0 0 1 734 137"
        fill="none"
        stroke="#fff1cf"
        strokeOpacity="0.13"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
});

function stationTeam(seat: number, teamCount: number): number {
  return seat % teamCount;
}
