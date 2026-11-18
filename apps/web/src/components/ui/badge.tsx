import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-gold/25 bg-gold/10 text-gold',
        secondary: 'border-border bg-secondary/60 text-secondary-foreground',
        outline: 'border-border/80 bg-transparent text-muted-foreground',
        success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-500 dark:text-emerald-300',
        destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
        felt: 'border-white/10 bg-black/25 text-cream/80',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
