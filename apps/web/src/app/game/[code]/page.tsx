import type { Metadata } from 'next';
import { GameClient } from './game-client';

export const metadata: Metadata = {
  title: 'The table',
  description: 'Live Jackaroo match.',
};

export default async function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <GameClient code={code.toUpperCase()} />;
}
