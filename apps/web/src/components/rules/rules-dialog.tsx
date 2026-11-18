'use client';

import Link from 'next/link';
import { BookOpen, ArrowUpRight } from 'lucide-react';
import type { PublicRules } from '@jackaroo/game-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Rulebook } from './rulebook';
import { Button } from '@/components/ui/button';

export function RulesDialog({
  rules,
  trigger,
}: {
  rules?: PublicRules;
  trigger?: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2">
            <BookOpen />
            Rules
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>How to play Jackaroo</DialogTitle>
          <DialogDescription>
            The house rules this table enforces. The server checks every line of them.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <Rulebook rules={rules} compact />
          <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
            <p className="text-[0.65rem] text-muted-foreground">
              Regional variants are documented in the full rulebook.
            </p>
            <Button asChild variant="link" size="sm" className="gap-1.5 px-0">
              <Link href="/rules">
                Full rulebook
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
