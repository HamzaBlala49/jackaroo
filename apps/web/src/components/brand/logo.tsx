'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  href?: string;
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
}

export function LogoMark({ className, size = 40 }: { className?: string; size?: number }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <defs>
        <radialGradient id={`${id}-felt`} cx="0.35" cy="0.25" r="0.9">
          <stop stopColor="#1b4b3d" />
          <stop offset="1" stopColor="#071b15" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="8" y1="4" x2="40" y2="45">
          <stop stopColor="#f3d99f" />
          <stop offset="0.45" stopColor="#d1a95f" />
          <stop offset="1" stopColor="#8d692c" />
        </linearGradient>
        <linearGradient id={`${id}-emerald`} x1="10" y1="8" x2="20" y2="20">
          <stop stopColor="#72e2c1" />
          <stop offset="1" stopColor="#23957b" />
        </linearGradient>
        <linearGradient id={`${id}-amber`} x1="30" y1="8" x2="40" y2="20">
          <stop stopColor="#ffd680" />
          <stop offset="1" stopColor="#d68c2f" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22.5" fill={`url(#${id}-felt)`} stroke={`url(#${id}-gold)`} strokeWidth="1.4" />
      <circle cx="24" cy="24" r="18.5" stroke="#e8cca0" strokeOpacity="0.18" strokeWidth="0.8" />
      <path
        d="M24 10.5v27M10.5 24h27M15.5 15.5l17 17M32.5 15.5l-17 17"
        stroke="#efd8a8"
        strokeOpacity="0.13"
        strokeWidth="0.8"
      />
      <circle cx="24" cy="24" r="7.2" fill="#09211a" stroke="#e4c58d" strokeOpacity="0.55" strokeWidth="0.9" />
      <path
        d="M24 18.8l1.6 3.6 3.6 1.6-3.6 1.6-1.6 3.6-1.6-3.6-3.6-1.6 3.6-1.6L24 18.8Z"
        fill={`url(#${id}-gold)`}
      />
      <circle cx="13.2" cy="13.2" r="3.1" fill={`url(#${id}-emerald)`} stroke="#04120e" strokeWidth="0.8" />
      <circle cx="34.8" cy="13.2" r="3.1" fill={`url(#${id}-amber)`} stroke="#04120e" strokeWidth="0.8" />
      <circle cx="13.2" cy="34.8" r="3.1" fill="#5b8def" stroke="#04120e" strokeWidth="0.8" />
      <circle cx="34.8" cy="34.8" r="3.1" fill="#df6a8c" stroke="#04120e" strokeWidth="0.8" />
    </svg>
  );
}

export function Logo({ href = '/', className, compact = false, showTagline = true }: LogoProps) {
  const content = (
    <span className={cn('group inline-flex items-center gap-2.5', className)}>
      <LogoMark
        size={compact ? 34 : 40}
        className="drop-shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:rotate-[8deg]"
      />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.12rem] font-semibold uppercase tracking-[0.16em] text-foreground">
          Jackaroo
        </span>
        {showTagline ? (
          <span className="mt-1 text-[0.55rem] font-semibold uppercase tracking-[0.42em] text-gold/80">
            Online
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="Jackaroo Online home" className="rounded-lg">
      {content}
    </Link>
  );
}
