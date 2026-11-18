import type { Metadata } from 'next';
import { PlayClient } from './play-client';

export const metadata: Metadata = {
  title: 'Play',
  description: 'Create a private Jackaroo room or join one with an invitation code.',
};

export default function PlayPage() {
  return <PlayClient />;
}
