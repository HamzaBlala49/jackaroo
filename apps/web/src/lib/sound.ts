'use client';

import type { GameFeedEvent } from '@jackaroo/game-types';
import { useSettingsStore } from '@/stores/settings-store';

type SoundName = 'click' | 'card' | 'move' | 'capture' | 'home' | 'finish' | 'win' | 'error' | 'turn';

class SoundManager {
  private context: AudioContext | null = null;
  private unlocked = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
    }
    return this.context;
  }

  unlock(): void {
    const context = this.getContext();
    if (!context) return;
    if (context.state === 'suspended') {
      void context.resume();
    }
    this.unlocked = true;
  }

  private tone(
    frequency: number,
    duration: number,
    options: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {},
  ): void {
    if (!useSettingsStore.getState().soundEnabled) return;
    const context = this.getContext();
    if (!context) return;
    if (context.state === 'suspended') void context.resume();
    const start = context.currentTime + (options.delay ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(options.slideTo, start + duration);
    }
    const peak = options.gain ?? 0.08;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  play(name: SoundName): void {
    if (!useSettingsStore.getState().soundEnabled) return;
    switch (name) {
      case 'click':
        this.tone(520, 0.05, { type: 'triangle', gain: 0.035 });
        break;
      case 'card':
        this.tone(340, 0.08, { type: 'triangle', gain: 0.05, slideTo: 420 });
        this.tone(680, 0.1, { type: 'sine', gain: 0.025, delay: 0.02 });
        break;
      case 'move':
        this.tone(392, 0.12, { type: 'sine', gain: 0.045, slideTo: 523 });
        break;
      case 'capture':
        this.tone(180, 0.18, { type: 'sawtooth', gain: 0.045, slideTo: 90 });
        this.tone(90, 0.22, { type: 'sine', gain: 0.06 });
        break;
      case 'home':
        this.tone(659, 0.18, { type: 'sine', gain: 0.05 });
        this.tone(988, 0.24, { type: 'sine', gain: 0.04, delay: 0.08 });
        break;
      case 'turn':
        this.tone(587, 0.1, { type: 'sine', gain: 0.03 });
        this.tone(880, 0.14, { type: 'sine', gain: 0.025, delay: 0.08 });
        break;
      case 'finish':
        this.tone(523, 0.14, { type: 'sine', gain: 0.05 });
        this.tone(784, 0.16, { type: 'sine', gain: 0.045, delay: 0.1 });
        this.tone(1047, 0.22, { type: 'sine', gain: 0.04, delay: 0.2 });
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((frequency, index) =>
          this.tone(frequency, 0.4, {
            type: 'triangle',
            gain: 0.055,
            delay: index * 0.13,
          }),
        );
        break;
      case 'error':
        this.tone(220, 0.17, { type: 'sawtooth', gain: 0.03, slideTo: 160 });
        break;
    }
  }

  handleFeed(events: GameFeedEvent[]): void {
    if (!useSettingsStore.getState().soundEnabled) return;
    for (const event of events) {
      switch (event.type) {
        case 'card-played':
        case 'card-discarded':
          this.play('card');
          break;
        case 'marble-captured':
          this.play('capture');
          break;
        case 'marble-home':
          this.play('home');
          break;
        case 'marble-moved':
        case 'marble-entered':
          this.play('move');
          break;
        case 'swap':
          this.tone(480, 0.13, { type: 'triangle', gain: 0.04, slideTo: 760 });
          break;
        case 'player-finished':
          this.play('finish');
          break;
        case 'turn-started':
          break;
        case 'game-finished':
          this.play('win');
          break;
        default:
          break;
      }
    }
  }

  unlockFromGesture(): void {
    if (this.unlocked) return;
    this.unlock();
  }
}

export const soundManager = new SoundManager();
