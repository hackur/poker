export const runtime = 'edge';

import { ResponsiveTableWrapper } from '@/components/responsive-table-wrapper';

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ResponsiveTableWrapper tableId={id} />;
}
