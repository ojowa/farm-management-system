jest.mock('@/modules/poultry', () => ({
  eggProductionAPI: { create: jest.fn(), list: jest.fn(), delete: jest.fn() },
  feedingRecordsAPI: { create: jest.fn(), list: jest.fn(), delete: jest.fn() },
  medicationAPI: { create: jest.fn(), list: jest.fn(), delete: jest.fn() },
  mortalityRecordsAPI: { create: jest.fn(), list: jest.fn(), delete: jest.fn() },
  poultrySalesAPI: { create: jest.fn(), list: jest.fn(), delete: jest.fn() },
  vaccinationRecordsAPI: { create: jest.fn(), list: jest.fn(), delete: jest.fn() },
}));

import {
  eggProductionAPI,
  feedingRecordsAPI,
  poultrySalesAPI,
} from '@/modules/poultry';
import {
  eggProductionConfig,
  feedingConfig,
  poultrySalesConfig,
} from '../modules/poultry/recordConfigs';

const mockCreateFeeding = jest.mocked(feedingRecordsAPI.create);
const mockCreateEggProduction = jest.mocked(eggProductionAPI.create);
const mockCreateSale = jest.mocked(poultrySalesAPI.create);

describe('poultry record API payloads', () => {
  beforeEach(() => jest.clearAllMocks());

  it('submits feeding quantity using the server quantityKg contract', async () => {
    await feedingConfig.create({
      flockId: 'flock-1',
      feedType: 'Starter',
      quantityKg: '12.5',
      date: '2025-04-15',
    });

    expect(mockCreateFeeding).toHaveBeenCalledWith({
      flockId: 'flock-1',
      feedType: 'Starter',
      quantityKg: 12.5,
      date: '2025-04-15',
    });
  });

  it('submits egg counts and notes using the server contract', async () => {
    await eggProductionConfig.create({
      flockId: 'flock-1',
      totalEggs: '100',
      goodEggs: '92',
      brokenEggs: '8',
      date: '2025-04-15',
      notes: '',
    });

    expect(mockCreateEggProduction).toHaveBeenCalledWith({
      flockId: 'flock-1',
      totalEggs: 100,
      goodEggs: 92,
      brokenEggs: 8,
      date: '2025-04-15',
      notes: null,
    });
  });

  it('submits poultry sales using the server product and revenue fields', async () => {
    await poultrySalesConfig.create({
      flockId: '',
      birdType: 'Broiler',
      quantity: '20',
      weight: '',
      pricePerBird: '2500',
      totalAmount: '50000',
      buyerName: '',
      paymentMethod: '',
      date: '2025-04-15',
      notes: '',
    });

    expect(mockCreateSale).toHaveBeenCalledWith({
      flockId: null,
      birdType: 'Broiler',
      quantity: 20,
      weight: null,
      pricePerBird: 2500,
      totalAmount: 50000,
      buyerName: null,
      paymentMethod: null,
      date: '2025-04-15',
      notes: null,
    });
  });
});
