import { getServerApiClient } from '@/lib/server-api';
import { CropsClient } from './CropsClient';

export const dynamic = 'force-dynamic';

export default async function CropsPage() {
  const api = await getServerApiClient();

  let crops: any[] = [];
  let farms: any[] = [];
  try {
    const [cropsRes, farmsRes] = await Promise.allSettled([
      api.crops.list(),
      api.farms.list(),
    ]);
    if (cropsRes.status === 'fulfilled') {
      crops = cropsRes.value.data?.crops || cropsRes.value.data || [];
      if (!Array.isArray(crops)) crops = [];
    }
    if (farmsRes.status === 'fulfilled') {
      farms = farmsRes.value.data?.farms || farmsRes.value.data || [];
      if (!Array.isArray(farms)) farms = [];
    }
  } catch {
    // Client will handle via React Query
  }

  return <CropsClient initialCrops={crops} initialFarms={farms} />;
}
