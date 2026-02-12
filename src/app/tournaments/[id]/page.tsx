export const runtime = 'edge';

import TournamentDetailPage from './tournament-detail-client';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TournamentDetailPage params={params} />;
}
