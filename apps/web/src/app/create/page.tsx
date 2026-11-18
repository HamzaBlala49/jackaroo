import type { Metadata } from 'next';
import type { PlayerCount } from '@jackaroo/game-types';
import { CreateRoomClient } from './create-client';

export const metadata: Metadata = {
  title: 'Create a room',
  description: 'Host a private Jackaroo table for 4, 6 or 8 players.',
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ players?: string }>;
}) {
  const params = await searchParams;
  const requested = Number(params.players);
  const initialPlayers: PlayerCount =
    requested === 6 || requested === 8 ? requested : 4;
  return <CreateRoomClient initialPlayers={initialPlayers} />;
}
