import type { Metadata } from 'next';
import { JoinRoomClient } from './join-client';

export const metadata: Metadata = {
  title: 'Join a room',
  description: 'Join a private Jackaroo table with an invitation code.',
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = (params.code ?? '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6);
  return <JoinRoomClient initialCode={code} />;
}
