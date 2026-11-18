'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettingsStore } from '@/stores/settings-store';
import { soundManager } from '@/lib/sound';

export function SoundToggle({ className }: { className?: string }) {
  const enabled = useSettingsStore((state) => state.soundEnabled);
  const toggle = useSettingsStore((state) => state.toggleSound);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={className}
          aria-label={enabled ? 'Mute sound' : 'Enable sound'}
          aria-pressed={enabled}
          onClick={() => {
            soundManager.unlockFromGesture();
            toggle();
            window.setTimeout(() => soundManager.play('click'), 30);
          }}
        >
          {enabled ? <Volume2 /> : <VolumeX />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{enabled ? 'Mute table sounds' : 'Enable table sounds'}</TooltipContent>
    </Tooltip>
  );
}
