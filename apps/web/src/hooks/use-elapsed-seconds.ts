'use client';

import * as React from 'react';

export function useElapsedSeconds(iso: string | null | undefined): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!iso) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [iso]);

  if (!iso) return 0;
  const started = new Date(iso).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 1000));
}
