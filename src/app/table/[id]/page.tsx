import { PokerTable } from '@/components/poker-table';

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <PokerTable tableId={id} />;
}
