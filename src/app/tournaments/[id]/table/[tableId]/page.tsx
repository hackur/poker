export const runtime = 'edge';

import TournamentTablePage from './table-client';

export default function Page({ params }: { params: Promise<{ id: string; tableId: string }> }) {
  return <TournamentTablePage params={params} />;
}
