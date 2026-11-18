import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Tiny wooden sound kit. All clips together are ~105 KB so the app stays small.
 * Players are created lazily and reused; `seekTo(0)` lets one clip retrigger.
 */

export type SoundName =
  | 'tap'
  | 'card'
  | 'move'
  | 'enter'
  | 'capture'
  | 'home'
  | 'win'
  | 'deal';

import tap from '../assets/sounds/tap.wav';
import card from '../assets/sounds/card.wav';
import move from '../assets/sounds/move.wav';
import enter from '../assets/sounds/enter.wav';
import capture from '../assets/sounds/capture.wav';
import home from '../assets/sounds/home.wav';
import win from '../assets/sounds/win.wav';
import deal from '../assets/sounds/deal.wav';

const sources: Record<SoundName, number> = {
  tap,
  card,
  move,
  enter,
  capture,
  home,
  win,
  deal,
};

const players = new Map<SoundName, AudioPlayer>();
let enabled = true;
let initialised = false;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export async function initSounds(): Promise<void> {
  if (initialised) return;
  initialised = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: false,
    });
  } catch {
    // Audio mode is best-effort; playback still works without it.
  }
}

function getPlayer(name: SoundName): AudioPlayer | null {
  if (!enabled) return null;
  let player = players.get(name);
  if (!player) {
    try {
      player = createAudioPlayer(sources[name]);
      player.volume = 0.85;
      players.set(name, player);
    } catch {
      return null;
    }
  }
  return player;
}

export function playSound(name: SoundName, volume = 1): void {
  const player = getPlayer(name);
  if (!player) return;
  try {
    player.volume = Math.max(0, Math.min(1, 0.85 * volume));
    void player.seekTo(0);
    player.play();
  } catch {
    // Ignore playback failures (e.g. too many simultaneous sounds).
  }
}

export function releaseSounds(): void {
  for (const player of players.values()) {
    try {
      player.pause();
    } catch {
      // ignore
    }
  }
}
