import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background">
      <Logo />
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-gold" />
        Setting the table
      </div>
    </div>
  );
}
