'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Play, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-provider';
import { cn, initials } from '@/lib/utils';

export function SiteHeader({ className }: { className?: string }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const nav = [
    { href: '/#how-to-play', label: 'How to play' },
    { href: '/rules', label: 'Rulebook' },
    { href: '/play', label: 'Private rooms' },
  ];

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('You left the table.');
      router.push('/');
    } catch {
      toast.error('Could not sign out right now.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl',
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground',
                pathname === item.href && 'text-gold',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-secondary/60" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full border border-border/70 bg-card/50 py-1 pl-1 pr-3 text-left transition hover:border-gold/35"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8 border border-gold/30">
                    <AvatarFallback className="bg-gold/15 text-[11px] text-gold">
                      {initials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-24 truncate text-xs font-medium sm:block">
                    {user.displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>At the table</DropdownMenuLabel>
                <div className="px-2.5 pb-2 text-sm font-medium">{user.displayName}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/play">
                    <Play />
                    Play a match
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <UserRound />
                  Guest identity
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onLogout}
                  disabled={loggingOut}
                >
                  <LogOut />
                  Leave identity
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="ml-1 rounded-full px-4">
              <Link href="/play">
                <Play />
                Play now
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
