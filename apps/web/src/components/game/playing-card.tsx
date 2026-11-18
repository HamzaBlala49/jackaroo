'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import type { Card } from '@jackaroo/game-types';
import { RANK_VALUE, SUIT_SYMBOL, isRedSuit } from '@jackaroo/game-types';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings-store';

type CardSize = 'xs' | 'sm' | 'md' | 'lg';

const sizes: Record<CardSize, string> = {
  xs: 'w-8 rounded-md',
  sm: 'w-12 rounded-lg',
  md: 'w-[4.1rem] rounded-xl sm:w-[4.6rem]',
  lg: 'w-24 rounded-xl sm:w-28',
};

interface PlayingCardProps {
  card: Card;
  size?: CardSize;
  selected?: boolean;
  disabled?: boolean;
  playable?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  tabIndex?: number;
  label?: string;
  asButton?: boolean;
}

export function PlayingCard({
  card,
  size = 'md',
  selected = false,
  disabled = false,
  playable = true,
  onClick,
  className,
  style,
  tabIndex,
  label,
  asButton = true,
}: PlayingCardProps) {
  const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);
  const red = isRedSuit(card.suit);
  const face = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
  const pipCount = RANK_VALUE[card.rank];

  const content = (
    <>
      <span className="absolute inset-[3px] rounded-[inherit] border border-[#8c6e3d]/30" />
      <span className="absolute inset-[5px] rounded-[inherit] border border-[#8c6e3d]/12" />
      <span
        className={cn(
          'absolute left-1.5 top-1 flex flex-col items-center leading-none sm:left-2 sm:top-1.5',
          size === 'xs' && 'left-1 top-0.5',
        )}
      >
        <span
          className={cn(
            'font-display font-semibold tracking-tight',
            red ? 'text-[#9e2e2c]' : 'text-[#1d2923]',
            size === 'lg' ? 'text-lg' : size === 'md' ? 'text-sm sm:text-base' : 'text-xs',
          )}
        >
          {card.rank}
        </span>
        <span
          className={cn(
            red ? 'text-[#a93a35]' : 'text-[#26352d]',
            size === 'lg' ? 'text-[0.7rem]' : 'text-[0.55rem]',
          )}
        >
          {SUIT_SYMBOL[card.suit]}
        </span>
      </span>
      <span
        className={cn(
          'absolute bottom-1 right-1.5 flex rotate-180 flex-col items-center leading-none sm:bottom-1.5 sm:right-2',
          size === 'xs' && 'bottom-0.5 right-1',
        )}
      >
        <span
          className={cn(
            'font-display font-semibold tracking-tight',
            red ? 'text-[#9e2e2c]' : 'text-[#1d2923]',
            size === 'lg' ? 'text-lg' : size === 'md' ? 'text-sm sm:text-base' : 'text-xs',
          )}
        >
          {card.rank}
        </span>
        <span
          className={cn(
            red ? 'text-[#a93a35]' : 'text-[#26352d]',
            size === 'lg' ? 'text-[0.7rem]' : 'text-[0.55rem]',
          )}
        >
          {SUIT_SYMBOL[card.suit]}
        </span>
      </span>

      <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className={cn(
            'font-display leading-none',
            red ? 'text-[#9e2e2c]/90' : 'text-[#1d2923]/90',
            size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-5xl' : 'text-2xl sm:text-3xl',
            face && 'font-semibold italic',
          )}
        >
          {face ? card.rank : SUIT_SYMBOL[card.suit]}
        </span>
        {!face && size !== 'xs' ? (
          <span
            className={cn(
              'font-display tracking-[0.22em]',
              red ? 'text-[#9e2e2c]/50' : 'text-[#1d2923]/45',
              size === 'lg' ? 'text-[0.6rem]' : 'text-[0.42rem] sm:text-[0.5rem]',
            )}
          >
            {cardRankWord(card.rank)}
          </span>
        ) : null}
        {!face && size === 'lg' ? (
          <span className="mt-1 flex gap-1 opacity-35">
            {Array.from({ length: Math.min(pipCount, 5) }, (_, index) => (
              <span key={index} className={red ? 'text-[#9e2e2c]' : 'text-[#1d2923]'}>
                <span className="text-[0.52rem]">{SUIT_SYMBOL[card.suit]}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>

      <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-3px_8px_rgba(101,72,36,0.12)]" />
    </>
  );

  const classes = cn(
    'group relative aspect-[5/7] shrink-0 overflow-visible border border-[#ad9265]/70 bg-[linear-gradient(150deg,#fffdf6,#f4ead5_55%,#ecdfc4)] text-left shadow-[0_10px_20px_-12px_rgba(0,0,0,0.8)] transition-[box-shadow,filter] duration-200',
    sizes[size],
    asButton && !disabled && 'hover:-translate-y-2 hover:shadow-[0_22px_40px_-18px_rgba(0,0,0,0.85)]',
    selected && 'ring-2 ring-gold ring-offset-2 ring-offset-background shadow-[0_22px_50px_-18px_rgba(216,179,106,0.65)]',
    disabled && 'opacity-70 saturate-[0.82]',
    playable && !disabled && 'cursor-pointer',
    className,
  );

  const inner = (
    <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
      {content}
      {playable ? (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 sm:bottom-1.5">
          <span className="block size-1 rounded-full bg-gold shadow-[0_0_5px_var(--gold)]" />
        </span>
      ) : null}
    </span>
  );

  const motionProps = animationsEnabled
    ? {
        layout: true as const,
        whileHover: disabled ? undefined : { y: selected ? -6 : -5 },
        transition: { type: 'spring' as const, stiffness: 320, damping: 26 },
      }
    : {};

  if (!asButton) {
    return (
      <div className={classes} style={style} aria-label={label}>
        {inner}
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      className={classes}
      style={style}
      onClick={onClick}
      disabled={disabled}
      tabIndex={tabIndex}
      aria-label={label ?? `${card.rank} of ${card.suit}`}
      aria-pressed={selected}
      {...motionProps}
    >
      {inner}
    </motion.button>
  );
}

function cardRankWord(rank: string): string {
  const words: Record<string, string> = {
    A: 'ACE',
    '2': 'TWO',
    '3': 'THREE',
    '4': 'FOUR',
    '5': 'FIVE',
    '6': 'SIX',
    '7': 'SEVEN',
    '8': 'EIGHT',
    '9': 'NINE',
    '10': 'TEN',
  };
  return words[rank] ?? '';
}
