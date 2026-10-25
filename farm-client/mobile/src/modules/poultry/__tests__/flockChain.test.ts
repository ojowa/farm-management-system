import { pensAPI, poultryHousesAPI, breedsAPI } from '../../../services/api';
import type { Pen, PoultryHouse } from '../../../services/types';
import {
  fetchBreedOptions,
  fetchHousesForFarm,
  fetchPensForFarm,
  fetchPensForHouse,
  scopePensToFarm,
  toHouseOptions,
  toPenOptions,
  unwrapList,
  unwrapOne,
} from '../flockChain';

jest.mock('../../../services/api', () => ({
  pensAPI: { list: jest.fn() },
  poultryHousesAPI: { list: jest.fn() },
  breedsAPI: { list: jest.fn() },
}));

const list = (pensAPI.list as jest.Mock);
const houseList = (poultryHousesAPI.list as jest.Mock);
const breedList = (breedsAPI.list as jest.Mock);

const house = (id: string, farmId: string): PoultryHouse => ({
  id,
  farmId,
  name: `House ${id}`,
  capacity: 100,
  createdAt: '',
  updatedAt: '',
});

const pen = (id: string, poultryHouseId: string, farmId?: string): Pen => ({
  id,
  poultryHouseId,
  ...(farmId ? { farmId } : {}),
  name: `Pen ${id}`,
  capacity: 50,
  createdAt: '',
  updatedAt: '',
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('unwrapList / unwrapOne', () => {
  it('reads a bare array, a data envelope and an items envelope', () => {
    expect(unwrapList([1, 2])).toEqual([1, 2]);
    expect(unwrapList({ data: [1, 2] })).toEqual([1, 2]);
    expect(unwrapList({ items: [1, 2] })).toEqual([1, 2]);
  });

  it('returns an empty list rather than throwing on an unexpected shape', () => {
    // The bug behind "PEN NOT LOADING": a nested envelope used to read as []
    // with no signal at all. This keeps the fallback, the callers surface it.
    expect(unwrapList({ data: { data: [] } })).toEqual([]);
    expect(unwrapList(undefined)).toEqual([]);
  });

  it('reads a single record bare or wrapped', () => {
    expect(unwrapOne({ id: 'a' })).toEqual({ id: 'a' });
    expect(unwrapOne({ data: { id: 'a' } })).toEqual({ id: 'a' });
    expect(unwrapOne({ data: {} })).toBeNull();
  });
});

describe('farm → house → pen chain', () => {
  it('requests houses scoped to the farm', async () => {
    houseList.mockResolvedValue({ data: { data: [house('h1', 'f1')] } });

    const result = await fetchHousesForFarm('f1');

    expect(houseList).toHaveBeenCalledWith({ farmId: 'f1', limit: 500 });
    expect(result.map((h) => h.id)).toEqual(['h1']);
  });

  it('requests pens scoped to the house', async () => {
    list.mockResolvedValue({ data: [pen('p1', 'h1')] });

    const result = await fetchPensForHouse('h1');

    expect(list).toHaveBeenCalledWith({ poultryHouseId: 'h1', limit: 500 });
    expect(result.map((p) => p.id)).toEqual(['p1']);
  });

  it('keeps a pen only when it belongs to the farm', () => {
    const houses = [house('h1', 'f1'), house('h2', 'f2')];
    const pens = [
      pen('p1', 'h1'), // linked only through its house
      pen('p2', 'h2', 'f1'), // linked only through the stamped farmId
      pen('p3', 'h2'), // another farm entirely
    ];

    const scoped = scopePensToFarm(pens, houses, 'f1');

    expect(scoped.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('never offers a pen when no farm is selected', () => {
    expect(scopePensToFarm([pen('p1', 'h1')], [house('h1', 'f1')], '')).toEqual([]);
  });

  it('filters a farm-wide pen response through the houses already loaded', async () => {
    houseList.mockResolvedValue({ data: [house('h1', 'f1'), house('h2', 'f2')] });
    // Server ignored farmId and returned every pen in the organization.
    list.mockResolvedValue({ data: [pen('p1', 'h1'), pen('p2', 'h2')] });

    const houses = await fetchHousesForFarm('f1');
    const pens = await fetchPensForFarm('f1', houses);

    expect(list).toHaveBeenCalledWith({ farmId: 'f1', limit: 500 });
    expect(pens.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('picker options', () => {
  it('labels a pen with its house so duplicate pen names stay apart', () => {
    const houses = [house('h1', 'f1')];
    expect(toPenOptions([pen('p1', 'h1')], houses)).toEqual([
      { id: 'p1', name: 'Pen p1 (House h1)' },
    ]);
  });

  it('falls back to the bare pen name when its house is unknown', () => {
    expect(toPenOptions([pen('p1', 'hX')], [])).toEqual([{ id: 'p1', name: 'Pen p1' }]);
  });

  it('maps houses to id/name options', () => {
    expect(toHouseOptions([house('h1', 'f1')])).toEqual([{ id: 'h1', name: 'House h1' }]);
  });

  it('renders breeds with their bird type', async () => {
    breedList.mockResolvedValue({ data: [{ id: 'b1', name: 'Cobb 500', birdType: 'BROILER' }] });

    await expect(fetchBreedOptions()).resolves.toEqual([{ id: 'b1', name: 'Cobb 500 · BROILER' }]);
    expect(breedList).toHaveBeenCalledWith({ limit: 500 });
  });
});
