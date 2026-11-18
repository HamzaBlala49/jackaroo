'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'motion/react';
import { ArrowRight, Loader2, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { displayNameSchema } from '@jackaroo/game-types';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-provider';
import { ApiError } from '@/lib/api';

const formSchema = z.object({
  displayName: displayNameSchema,
});
type FormValues = z.infer<typeof formSchema>;

interface OnboardingGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  context?: string;
}

export function OnboardingGate({
  children,
  title = 'Take a seat',
  description = 'Choose the name your friends will see at the table. No email, no password, no waiting around.',
  context,
}: OnboardingGateProps) {
  const { user, isLoading, isLoggingIn, login } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { displayName: '' },
    mode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const created = await login(values.displayName);
      toast.success(`Welcome to the table, ${created.displayName.split(' ')[0]}.`);
      form.reset({ displayName: created.displayName });
    } catch (submitError) {
      const message =
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not take a seat. Please try again.';
      setError(message);
    }
  });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 text-muted-foreground">
          <Logo href={undefined} />
          <Loader2 className="size-5 animate-spin text-gold" />
          <p className="text-xs uppercase tracking-[0.2em]">Setting the table…</p>
        </div>
      </div>
    );
  }

  if (user) return <>{children}</>;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(216,179,106,0.13),transparent_60%),radial-gradient(ellipse_70%_70%_at_100%_90%,rgba(20,81,64,0.22),transparent_65%)]" />
        <div className="absolute -left-40 top-1/4 size-[560px] rounded-full border border-gold/10" />
        <div className="absolute -left-20 top-1/4 size-[400px] rounded-full border border-gold/10" />
        <div className="absolute -right-56 -top-24 size-[640px] rounded-full border border-gold/10" />
      </div>

      <div className="relative z-10 flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo />
        <ThemeToggle />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-gold/20 bg-card/85 shadow-[0_50px_160px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl md:grid-cols-[1.08fr_0.92fr]"
        >
          <div className="felt-texture felt-noise relative flex min-h-80 flex-col justify-between overflow-hidden p-8 text-cream sm:p-11">
            <div className="relative z-10">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-gold-bright/80">
                Invitation to the table
              </p>
              <h1 className="mt-5 max-w-md font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
                Four marbles.
                <br />
                One lap.
                <br />
                <span className="italic text-gold-bright">No mercy.</span>
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/65">
                A private table for you and your friends. Create a room, share the code,
                and let the marbles do the talking.
              </p>
            </div>

            <div className="relative z-10 mt-10 space-y-4">
              <Feature icon={<UsersRound />} title="4, 6 or 8 players" text="Teams assigned evenly, teammates opposite." />
              <Feature icon={<Sparkles />} title="Live, server-run table" text="Private hands, validated moves, no fudging." />
              <Feature icon={<ShieldCheck />} title="Reconnect without losing" text="Refresh, drop signal, come straight back." />
            </div>

            <div className="pointer-events-none absolute -bottom-28 -right-24 size-72 rounded-full border border-gold/15" />
            <div className="pointer-events-none absolute -bottom-20 -right-16 size-52 rounded-full border border-gold/10" />
            <div className="pointer-events-none absolute bottom-12 right-12 flex gap-2">
              <span className="size-3 rounded-full bg-[#35b99c] shadow-[0_0_16px_rgba(53,185,156,0.6)]" />
              <span className="size-3 rounded-full bg-[#e9a23b] shadow-[0_0_16px_rgba(233,162,59,0.6)]" />
              <span className="size-3 rounded-full bg-[#5b8def] shadow-[0_0_16px_rgba(91,141,239,0.6)]" />
              <span className="size-3 rounded-full bg-[#df6a8c] shadow-[0_0_16px_rgba(223,106,140,0.6)]" />
            </div>
          </div>

          <div className="p-8 sm:p-11">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-gold">
              {context ?? 'Guest seat'}
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="displayName">Your name at the table</Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Ada Lovelace"
                  autoComplete="nickname"
                  autoFocus
                  maxLength={24}
                  {...form.register('displayName')}
                />
                {form.formState.errors.displayName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.displayName.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">2–24 characters. Visible to your friends.</p>
                )}
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" size="lg" className="w-full" loading={isLoggingIn}>
                {isLoggingIn ? 'Opening the door' : 'Enter the room'}
                {!isLoggingIn ? <ArrowRight /> : null}
              </Button>
            </form>

            <div className="mt-8 border-t border-border/60 pt-5 text-[0.7rem] leading-relaxed text-muted-foreground">
              Your guest identity is stored in a secure browser session. It keeps your seat and
              lifetime record on this device. Jackaroo never asks for an email or password in v1.
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold-bright [&_svg]:size-4">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cream/90">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-cream/50">{text}</p>
      </div>
    </div>
  );
}
