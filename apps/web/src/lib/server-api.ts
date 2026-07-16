import { cookies } from 'next/headers';
import { createFarmManagementClient } from '@farm/api-client';

/**
 * Server-side API client that reads auth cookies from the request.
 * Use this in server components to fetch data with the user's credentials.
 */
export async function getServerApiClient() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const client = createFarmManagementClient({
    baseURL: process.env.API_URL || 'http://localhost:4000',
    timeout: 15000,
    headers: {
      Cookie: cookieHeader,
    },
  });

  return {
    client: client.client,
    farms: client.farms,
    crops: client.crops,
    livestock: client.livestock,
    finance: client.finance,
    tasks: client.tasks,
    attendance: client.attendance,
    workers: client.workers,
    inventory: client.inventory,
    equipment: client.equipment,
    poultry: client.poultry,
    feedingRecords: client.feedingRecords,
    vaccinationRecords: client.vaccinationRecords,
    mortalityRecords: client.mortalityRecords,
    eggProduction: client.eggProduction,
    medication: client.medication,
    contracts: client.contracts,
    marketplace: client.marketplace,
    reports: client.reports,
    weather: client.weather,
  };
}

/**
 * Get the current user from the auth service.
 * Returns null if not authenticated.
 */
export async function getServerUser() {
  try {
    const { client } = await getServerApiClient();
    const { data } = await client.get('/auth/me');
    return data;
  } catch {
    return null;
  }
}
