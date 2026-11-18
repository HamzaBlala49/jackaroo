import type { Metadata } from 'next';
import { ResultsClient } from './results-client';

export const metadata: Metadata = {
  title: 'Match results',
  description: 'Final scores and match statistics.',
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <ResultsClient matchId={matchId} />;
}
