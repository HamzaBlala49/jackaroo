import type { Metadata } from 'next';
import { RoomClient } from './room-client';

export const metadata: Metadata = {
  title: 'Waiting room',
  description: 'Your private Jackaroo table is filling up.',
};

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase()} />;
}
