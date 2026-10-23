import {
  eggProductionAPI,
  feedingRecordsAPI,
  medicationAPI,
  mortalityRecordsAPI,
  poultrySalesAPI,
  vaccinationRecordsAPI,
} from '@/lib/api';

export type PoultryRecordField = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'flock' | 'status';
  nullable?: boolean;
};

type PoultryRecordApi = {
  get: (id: string) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
};

export const poultryRecordConfigs: Record<
  string,
  { title: string; api: PoultryRecordApi; fields: PoultryRecordField[] }
> = {
  'egg-production': {
    title: 'Egg Production',
    api: eggProductionAPI,
    fields: [
      { key: 'flockId', label: 'Flock', type: 'flock' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'totalEggs', label: 'Total eggs', type: 'number' },
      { key: 'goodEggs', label: 'Good eggs', type: 'number' },
      { key: 'brokenEggs', label: 'Broken eggs', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea', nullable: true },
    ],
  },
  feeding: {
    title: 'Feeding Record',
    api: feedingRecordsAPI,
    fields: [
      { key: 'flockId', label: 'Flock', type: 'flock' },
      { key: 'feedType', label: 'Feed type', type: 'text' },
      { key: 'quantityKg', label: 'Quantity (kg)', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  vaccinations: {
    title: 'Vaccination Record',
    api: vaccinationRecordsAPI,
    fields: [
      { key: 'flockId', label: 'Flock', type: 'flock' },
      { key: 'vaccine', label: 'Vaccine', type: 'text' },
      { key: 'dosage', label: 'Dosage', type: 'text', nullable: true },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  mortality: {
    title: 'Mortality Record',
    api: mortalityRecordsAPI,
    fields: [
      { key: 'flockId', label: 'Flock', type: 'flock' },
      { key: 'count', label: 'Count', type: 'number' },
      { key: 'cause', label: 'Cause', type: 'text', nullable: true },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  medications: {
    title: 'Medication',
    api: medicationAPI,
    fields: [
      { key: 'flockId', label: 'Flock', type: 'flock' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'dosage', label: 'Dosage', type: 'text' },
      { key: 'frequency', label: 'Frequency', type: 'text' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End date', type: 'date', nullable: true },
      { key: 'notes', label: 'Notes', type: 'textarea', nullable: true },
      { key: 'status', label: 'Status', type: 'status' },
    ],
  },
  sales: {
    title: 'Poultry Sale',
    api: poultrySalesAPI,
    fields: [
      { key: 'farmId', label: 'Farm ID', type: 'text', nullable: true },
      { key: 'flockId', label: 'Flock', type: 'flock', nullable: true },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'buyerName', label: 'Buyer', type: 'text', nullable: true },
      { key: 'birdType', label: 'Bird type', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'weight', label: 'Weight', type: 'number', nullable: true },
      { key: 'pricePerBird', label: 'Price per bird', type: 'number', nullable: true },
      { key: 'totalAmount', label: 'Total amount', type: 'number' },
      { key: 'paymentMethod', label: 'Payment method', type: 'text', nullable: true },
      { key: 'notes', label: 'Notes', type: 'textarea', nullable: true },
    ],
  },
};

export function unwrapPoultryRecord(payload: any): Record<string, any> | null {
  const value = payload?.data ?? payload;
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
