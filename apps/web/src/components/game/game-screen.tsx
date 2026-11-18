'use client';

import * as React from 'react';
import { getTeamPalette } from '@jackaroo/game-config';
import type { GameSnapshot } from '@jackaroo/game-types';
import { WifiOff } from 'lucide-react';
import { GameHeader } from '@/components/game/game-header';
import { GameBoard } from '@/components/board/game-board';
import { HandDock } from '@/components/game/hand-dock';
import { MatchPanel } from '@/components/game/match-panel';
import { PlayerRail } from '@/components/game/player-rail';
import { TurnBar } from '@/components/game/turn-bar';
import { useGameInteraction } from '@/components/game/use-game-interaction';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useGameSocket } from '@/lib/socket-provider';

export function GameScreen({
  snapshot,
  youId,
}: {
  snapshot: GameSnapshot;
  youId: string | null;
}) {
  const interaction = useGameInteraction(snapshot.code);
  const { connected } = useGameSocket();
  const [tableOpen, setTableOpen] = React.useState(false);
  const current = snapshot.currentPlayerId
    ? snapshot.players.find((player) => player.id === snapshot.currentPlayerId)
    : undefined;
  const palette = current ? getTeamPalette(current.teamId) : null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#04120f] text-cream lg:h-dvh lg:overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-15%,rgba(216,179,106,0.12),transparent_60%),radial-gradient(ellipse_50%_70%_at_50%_110%,rgba(18,82,66,0.18),transparent_65%)]" />
        {palette ? (
          <div
            className="absolute left-1/2 top-1/2 size-[58rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.055] blur-2xl"
            style={{ background: `radial-gradient(circle, ${palette.primary}, transparent 65%)` }}
          />
        ) : null}
      </div>

      <GameHeader snapshot={snapshot} onOpenTable={() => setTableOpen(true)} />

      {!connected ? (
        <div className="relative z-30 flex items-center justify-center gap-2 border-b border-amber-300/15 bg-amber-400/8 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
          <WifiOff className="size-3" />
          Reconnecting — your seat and hand are safe
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 flex-1 flex-col" aria-label="Jackaroo match">
          <div className="hidden sm:block lg:hidden">
            <PlayerRail snapshot={snapshot} youId={youId} />
          </div>

          <div className="hidden px-2 pt-1 sm:block sm:px-4 lg:px-5 lg:pt-2">
            <TurnBar snapshot={snapshot} youId={youId} />
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-2 sm:px-3 lg:py-2">
            <div className="w-full max-w-[min(100%,max(20rem,calc(100dvh-26rem)))] lg:max-w-[min(100%,max(22rem,calc(100dvh-22.5rem)))]">
              <GameBoard
                snapshot={snapshot}
                sourceMarbleIds={interaction.sourceIds}
                enterMarbleIds={interaction.enterIds}
                targetMarbleIds={interaction.targetIds}
                focusedMarbleId={interaction.focusedMarbleId}
                preview={interaction.preview}
                onMarbleClick={interaction.handleMarbleClick}
                onMarbleHover={interaction.handleMarbleHover}
                disabled={!connected || interaction.pending}
              />
            </div>
          </div>

          <HandDock interaction={interaction} locked={!connected} />
        </main>

        <aside className="hidden w-[21rem] shrink-0 border-l border-white/8 bg-[#051713]/65 lg:flex xl:w-[23rem]">
          <MatchPanel snapshot={snapshot} />
        </aside>
      </div>

      <Sheet open={tableOpen} onOpenChange={setTableOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="px-5 pb-0 pt-5">
            <SheetTitle>The table</SheetTitle>
          </SheetHeader>
          <div className="mt-2 flex h-[72dvh] min-h-0 flex-col">
            <MatchPanel snapshot={snapshot} compact />
          </div>
        </SheetContent>
      </Sheet>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {snapshot.status === 'finished'
          ? 'The match has finished.'
          : current
            ? `${current.name}'s turn. Round ${snapshot.round}.${
                snapshot.phase === 'seven'
                  ? ` Seven split with ${snapshot.seven?.remaining ?? 0} steps remaining.`
                  : ''
              }`
            : 'Waiting for the table.'}
      </div>
    </div>
  );
}
