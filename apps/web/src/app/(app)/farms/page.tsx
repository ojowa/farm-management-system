import { getServerApiClient } from '@/lib/server-api';
import { FarmsClient } from './FarmsClient';

export const dynamic = 'force-dynamic';

export default async function FarmsPage() {
  const api = await getServerApiClient();

  let farms: any[] = [];
  try {
    const { data } = await api.farms.list();
    farms = data?.farms || data || [];
    if (!Array.isArray(farms)) farms = [];
  } catch {
    // User not authenticated or API error — client will handle via React Query
  }

  return <FarmsClient initialFarms={farms} />;
}
