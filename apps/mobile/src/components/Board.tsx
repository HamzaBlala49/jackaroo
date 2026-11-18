import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  buildMarbleLayout,
  getRoutePoints,
  pointForProgress,
  type BoardModel,
  type RenderMarble,
} from '@jackaroo/game-board';
import type { PublicPlayerState } from '@jackaroo/game-types';
import { colors, teamPalette } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface BoardHighlights {
  sourceIds?: string[];
  enterIds?: string[];
  targetIds?: string[];
  focusedId?: string | null;
}

export interface BoardPreviewInfo {
  marbleId: string;
  toProgress: number;
}

export function GameBoard({
  board,
  players,
  size,
  highlights,
  preview,
  onMarblePress,
}: {
  board: BoardModel;
  players: PublicPlayerState[];
  size: number;
  highlights?: BoardHighlights;
  preview?: BoardPreviewInfo | null;
  onMarblePress?: (marbleId: string) => void;
}) {
  const layout = useMemo(() => buildMarbleLayout(players, board), [board, players]);
  const byId = useMemo(() => new Map(layout.map((m) => [m.id, m])), [layout]);

  const sourceIds = useMemo(() => new Set(highlights?.sourceIds ?? []), [highlights]);
  const enterIds = useMemo(() => new Set(highlights?.enterIds ?? []), [highlights]);
  const targetIds = useMemo(() => new Set(highlights?.targetIds ?? []), [highlights]);

  const previewVisual = useMemo(() => {
    if (!preview) return null;
    const marble = byId.get(preview.marbleId);
    if (!marble) return null;
    const dest = pointForProgress(board, marble.seat, preview.toProgress);
    const path = getRoutePoints(board, marble.seat, marble.progress ?? 0, preview.toProgress);
    return { marble, dest, path };
  }, [board, byId, preview]);

  const scale = size / board.viewBoxSize;

  return (
    <Svg width={size} height={size} viewBox="0 0 1000 1000">
      <Defs>
        <LinearGradient id="woodGrad" x1="0.1" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor="#a5713d" />
          <Stop offset="0.45" stopColor="#7a4a24" />
          <Stop offset="1" stopColor="#543014" />
        </LinearGradient>
        <RadialGradient id="feltGrad" cx="0.4" cy="0.3" r="0.8">
          <Stop offset="0" stopColor="#8a2626" />
          <Stop offset="0.55" stopColor="#6b1717" />
          <Stop offset="1" stopColor="#471010" />
        </RadialGradient>
        <RadialGradient id="medallionGrad" cx="0.35" cy="0.3" r="0.8">
          <Stop offset="0" stopColor="#8a5a30" />
          <Stop offset="1" stopColor="#4a2a14" />
        </RadialGradient>
        {colors.teams.map((team) => (
          <RadialGradient key={team.id} id={`marble-${team.id}`} cx="0.35" cy="0.28" r="0.8">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
            <Stop offset="0.2" stopColor={team.pale} />
            <Stop offset="0.5" stopColor={team.primary} />
            <Stop offset="1" stopColor={team.deep} />
          </RadialGradient>
        ))}
        {colors.teams.map((team) => (
          <LinearGradient key={`dock-${team.id}`} id={`dock-${team.id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={team.primary} stopOpacity="0.9" />
            <Stop offset="1" stopColor={team.deep} stopOpacity="0.95" />
          </LinearGradient>
        ))}
      </Defs>

      {/* Wooden board rim following the chosen outline */}
      <G transform="translate(500 500) scale(1.42) translate(-500 -500)">
        <Path d={board.outlinePath} fill="url(#woodGrad)" stroke="#3a2110" strokeWidth={6 / 1.42} />
      </G>
      <G transform="translate(500 500) scale(1.22) translate(-500 -500)">
        <Path d={board.outlinePath} fill="url(#feltGrad)" stroke="rgba(217,168,78,0.4)" strokeWidth={2} />
      </G>
      <G transform="translate(500 500) scale(1.22) translate(-500 -500)">
        <Path d={board.outlinePath} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={10} />
      </G>

      {/* Home lanes */}
      {board.stations.map((station) => {
        const team = teamPalette(station.teamId);
        return (
          <G key={`lane-${station.seat}`}>
            <Path d={station.homeLanePath} fill={team.primary} fillOpacity={0.16} stroke={team.primary} strokeOpacity={0.35} strokeWidth={1.2} />
          </G>
        );
      })}

      {/* Ring cells */}
      {board.ring.map((cell) => {
        const isStart = cell.isStart;
        const team = cell.startSeat !== null ? teamPalette(cell.startSeat % board.teamCount) : null;
        const size = isStart ? 30 : 26;
        const fill = isStart
          ? team?.primary ?? '#173b31'
          : cell.isNeutralSafe
            ? '#f0e2c4'
            : cell.index % 2 === 0
              ? '#e9dcc0'
              : '#dccaa7';
        return (
          <G key={cell.index} transform={`translate(${cell.x} ${cell.y}) rotate(${cell.rotationDeg})`}>
            {isStart && team ? <Circle r={22} fill={team.primary} opacity={0.14} /> : null}
            <Rect
              x={-size / 2}
              y={-size / 2}
              width={size}
              height={size}
              rx={isStart ? 8 : 6.5}
              fill={fill}
              stroke={isStart ? (team?.primary ?? '#d8b36a') : 'rgba(83,62,32,0.55)'}
              strokeWidth={isStart ? 1.4 : 0.9}
            />
            {isStart || cell.isNeutralSafe ? (
              <Path
                d="M0 -7.4 L1.9 -1.9 7.4 0 1.9 1.9 0 7.4 -1.9 1.9 -7.4 0 -1.9 -1.9 Z"
                fill={isStart ? '#fff6df' : '#9d742d'}
                opacity={isStart ? 1 : 0.85}
              />
            ) : (
              <Circle r={1.3} fill="#8c6b3b" opacity={0.3} />
            )}
          </G>
        );
      })}

      {/* Home slots */}
      {board.stations.map((station) => {
        const team = teamPalette(station.teamId);
        return station.homeSlots.map((slot) => (
          <G key={`home-${station.seat}-${slot.slot}`} transform={`translate(${slot.x} ${slot.y}) rotate(${slot.rotationDeg})`}>
            <Rect
              x={-14.5}
              y={-14.5}
              width={29}
              height={29}
              rx={7}
              fill="#3a0f0f"
              stroke={team.primary}
              strokeOpacity={0.8}
              strokeWidth={1.2}
            />
            <Rect
              x={-10.5}
              y={-10.5}
              width={21}
              height={21}
              rx={5}
              fill={team.primary}
              fillOpacity={0.16}
              stroke={team.primary}
              strokeOpacity={0.35}
              strokeWidth={0.7}
            />
          </G>
        ));
      })}

      {/* Base docks */}
      {board.stations.map((station) => {
        const team = teamPalette(station.teamId);
        return (
          <G
            key={`base-${station.seat}`}
            transform={`translate(${station.baseCenter.x} ${station.baseCenter.y}) rotate(${station.baseRotationDeg})`}
          >
            <Circle r={39} fill={team.primary} opacity={0.1} />
            <Rect
              x={-44}
              y={-34}
              width={88}
              height={68}
              rx={17}
              fill={`url(#dock-${team.id})`}
              stroke={team.primary}
              strokeOpacity={0.55}
              strokeWidth={1.1}
            />
            <Rect
              x={-39}
              y={-29}
              width={78}
              height={58}
              rx={13}
              fill="none"
              stroke="#f4e3bf"
              strokeOpacity={0.18}
              strokeWidth={0.8}
            />
            <Path d="M0 -27 L3 -23 0 -19 -3 -23 Z" fill="#d9a84e" opacity={0.8} />
            {station.baseSockets.map((_, socketIndex) => {
              const column = socketIndex % 2;
              const row = Math.floor(socketIndex / 2);
              return (
                <G key={socketIndex} transform={`translate(${column === 0 ? -18 : 18} ${row === 0 ? -14 : 14})`}>
                  <Circle r={11.2} fill="#3a0f0f" opacity={0.32} />
                  <Circle r={9.8} fill="#471010" stroke="rgba(240,215,164,0.2)" strokeWidth={0.8} />
                </G>
              );
            })}
          </G>
        );
      })}

      {/* Centre medallion */}
      <Circle cx={500} cy={500} r={120} fill="#3a0f0f" stroke="rgba(217,168,78,0.5)" strokeWidth={1.5} />
      <Circle cx={500} cy={500} r={110} fill="url(#medallionGrad)" stroke="rgba(217,168,78,0.25)" strokeWidth={1} />
      <Circle cx={500} cy={500} r={78} fill="rgba(0,0,0,0.35)" stroke="rgba(217,168,78,0.35)" strokeWidth={1} />
      <Path
        d="M500 424 L509 487 572 500 509 513 500 576 491 513 428 500 491 487 Z"
        fill="#d9a84e"
        opacity={0.9}
      />
      <Circle cx={500} cy={500} r={7.5} fill="#3a0f0f" stroke="#d9a84e" strokeWidth={1} />

      {/* Entry halos (one per base with an eligible marble) */}
      {Array.from(enterIds).map((marbleId) => {
        const marble = byId.get(marbleId);
        if (!marble || marble.status !== 'base') return null;
        const station = board.stations[marble.seat];
        if (!station) return null;
        return (
          <G key={`enter-${marbleId}`}>
            <Circle
              cx={station.baseCenter.x}
              cy={station.baseCenter.y}
              r={52}
              fill="none"
              stroke={colors.goldPale}
              strokeWidth={2}
              strokeDasharray="3 7"
              opacity={0.9}
            />
          </G>
        );
      })}

      {/* Preview path + destination */}
      {previewVisual ? (
        <G pointerEvents="none">
          <Path
            d={previewVisual.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <Path
            d={previewVisual.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            fill="none"
            stroke={colors.goldPale}
            strokeWidth={2}
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
          <Circle
            cx={previewVisual.dest.x}
            cy={previewVisual.dest.y}
            r={22}
            fill="none"
            stroke={colors.goldPale}
            strokeWidth={1.5}
            strokeDasharray="2 5"
            opacity={0.8}
          />
          <Circle cx={previewVisual.dest.x} cy={previewVisual.dest.y} r={11} fill={colors.goldPale} opacity={0.22} />
        </G>
      ) : null}

      {/* Marbles */}
      {layout.map((marble) => (
        <MarbleView
          key={marble.id}
          marble={marble}
          isSource={sourceIds.has(marble.id) || enterIds.has(marble.id)}
          isTarget={targetIds.has(marble.id)}
          isFocused={highlights?.focusedId === marble.id}
          onPress={onMarblePress ? () => onMarblePress(marble.id) : undefined}
          scale={scale}
        />
      ))}
    </Svg>
  );
}

function MarbleView({
  marble,
  isSource,
  isTarget,
  isFocused,
  onPress,
  scale,
}: {
  marble: RenderMarble;
  isSource: boolean;
  isTarget: boolean;
  isFocused: boolean;
  onPress?: () => void;
  scale: number;
}) {
  const team = teamPalette(marble.teamId);
  const x = useRef(new Animated.Value(marble.x)).current;
  const y = useRef(new Animated.Value(marble.y)).current;
  const r = useRef(new Animated.Value(marble.radius)).current;
  const prev = useRef({ x: marble.x, y: marble.y });

  useEffect(() => {
    const moved =
      Math.abs(prev.current.x - marble.x) > 0.5 || Math.abs(prev.current.y - marble.y) > 0.5;
    prev.current = { x: marble.x, y: marble.y };

    Animated.parallel([
      Animated.spring(x, {
        toValue: marble.x,
        friction: 6,
        tension: 130,
        useNativeDriver: false,
      }),
      Animated.spring(y, {
        toValue: marble.y,
        friction: 6,
        tension: 130,
        useNativeDriver: false,
      }),
    ]).start();

    if (moved) {
      Animated.sequence([
        Animated.timing(r, { toValue: marble.radius * 1.22, duration: 90, useNativeDriver: false }),
        Animated.spring(r, { toValue: marble.radius, friction: 3, tension: 160, useNativeDriver: false }),
      ]).start();
    } else {
      r.setValue(marble.radius);
    }
  }, [marble.x, marble.y, marble.radius, r, x, y]);

  const haloRadius = marble.radius + (isFocused ? 10 : 7);
  const haloColor = isTarget ? '#f4c9d4' : colors.goldPale;

  return (
    <G>
      {/* soft shadow */}
      <AnimatedCircle
        cx={x}
        cy={Animated.add(y, marble.radius * 0.55) as unknown as number}
        r={marble.radius * 0.9}
        fill="#000"
        opacity={0.35}
      />
      {/* highlight halo */}
      {(isSource || isTarget) ? (
        <G>
          <Circle cx={marble.x} cy={marble.y} r={haloRadius + 2} fill="none" stroke="#3a0f0f" strokeWidth={5} opacity={0.7} />
          <Circle
            cx={marble.x}
            cy={marble.y}
            r={haloRadius}
            fill="none"
            stroke={haloColor}
            strokeWidth={isFocused ? 2.6 : 1.9}
            strokeDasharray={isTarget ? '2 4' : isFocused ? undefined : '3 5'}
            opacity={0.95}
          />
        </G>
      ) : null}
      {/* the marble */}
      <AnimatedCircle
        cx={x}
        cy={y}
        r={r}
        fill={`url(#marble-${team.id})`}
        stroke={team.deep}
        strokeWidth={0.9}
        onPress={onPress}
      />
      <AnimatedCircle cx={x} cy={y} r={Animated.multiply(r, 0.82) as unknown as number} fill="none" stroke="#ffffff" strokeOpacity={0.2} strokeWidth={0.7} />
      {/* generous invisible hit area */}
      {onPress ? (
        <Circle cx={marble.x} cy={marble.y} r={Math.max(24, 44 / scale)} fill="transparent" onPress={onPress} />
      ) : null}
    </G>
  );
}

export const boardStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
