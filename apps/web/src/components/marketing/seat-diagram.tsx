import { createBoardModel } from '@jackaroo/game-board';
import { getTeamPalette } from '@jackaroo/game-config';
import type { PlayerCount } from '@jackaroo/game-types';

export function SeatDiagram({ playerCount }: { playerCount: PlayerCount }) {
  const board = createBoardModel(playerCount);
  return (
    <svg viewBox="0 0 200 200" className="size-28" aria-hidden>
      <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeOpacity="0.14" />
      <circle cx="100" cy="100" r="52" fill="none" stroke="currentColor" strokeOpacity="0.09" />
      <circle cx="100" cy="100" r="8" fill="none" stroke="currentColor" strokeOpacity="0.18" />
      <circle cx="100" cy="100" r="2.5" fill="var(--gold)" opacity="0.6" />
      {Array.from({ length: 72 }, (_, index) => {
        const angle = ((90 + index * 5) * Math.PI) / 180;
        const x = 100 + Math.cos(angle) * 76;
        const y = 100 + Math.sin(angle) * 76;
        return <circle key={index} cx={x} cy={y} r="0.8" fill="currentColor" opacity="0.14" />;
      })}
      {board.stations.map((station) => {
        const team = getTeamPalette(station.teamId);
        const angle = (station.startAngleDeg * Math.PI) / 180;
        const x = 100 + Math.cos(angle) * 76;
        const y = 100 + Math.sin(angle) * 76;
        const innerX = 100 + Math.cos(angle) * 52;
        const innerY = 100 + Math.sin(angle) * 52;
        return (
          <g key={station.seat}>
            <line x1={x} y1={y} x2={innerX} y2={innerY} stroke={team.primary} strokeOpacity="0.18" />
            <circle cx={x} cy={y} r="6.5" fill={team.deep} stroke={team.primary} strokeWidth="1.4" />
            <circle cx={x} cy={y} r="2.4" fill={team.primary} opacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
}
