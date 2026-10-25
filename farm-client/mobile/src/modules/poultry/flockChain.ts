/**
 * The farm → house → pen chain, in one place.
 *
 * A pen only ever belongs to a poultry house, and a house only ever belongs to
 * a farm — so the only way to answer "which pens can this flock live in?" is
 * to walk that chain. Every screen that offers a pen picker (add, edit) loads
 * through these helpers so they all resolve the same data the same way:
 *
 *   farm  ──► /poultry-houses?farmId=…   ──► houses of that farm
 *   house ──► /pens?poultryHouseId=…     ──► pens of that house
 *   farm  ──► /pens?farmId=…             ──► pens of that farm (one request,
 *                                            narrowed locally through the
 *                                            houses we already loaded)
 *
 * The server filters `/pens` by `farmId` through the Pen → House → Farm
 * relation, but older builds ignore the parameter. `scopePensToFarm` re-applies
 * the chain client-side, so an unfiltered response can never leak pens from
 * another farm into the picker.
 */
import { breedsAPI, pensAPI, poultryHousesAPI } from '../../services/api';
import type { Breed, Pen, PoultryHouse } from '../../services/types';

/** A pickable row: every picker in the poultry flow is id + display name. */
export interface NameOption {
  id: string;
  name: string;
}

/** A list arrives as a bare array or inside `{ data: [...] }` / `{ items: [...] }`. */
export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const value = payload as { data?: unknown; items?: unknown };
    if (Array.isArray(value.data)) return value.data as T[];
    if (Array.isArray(value.items)) return value.items as T[];
  }
  return [];
}

/** A single entity arrives bare or wrapped in `{ data: { … } }`. */
export function unwrapOne<T>(payload: unknown): T | null {
  if (payload && typeof payload === 'object' && 'id' in (payload as object)) {
    return payload as T;
  }
  const wrapped = (payload as { data?: unknown })?.data;
  if (wrapped && typeof wrapped === 'object' && 'id' in wrapped) {
    return wrapped as T;
  }
  return null;
}

/** Houses of a single farm — the middle link of the chain. */
export async function fetchHousesForFarm(farmId: string): Promise<PoultryHouse[]> {
  const response = await poultryHousesAPI.list({ farmId, limit: 500 });
  return unwrapList<PoultryHouse>(response.data);
}

/** Pens of a single house — the leaf of the chain. */
export async function fetchPensForHouse(houseId: string): Promise<Pen[]> {
  const response = await pensAPI.list({ poultryHouseId: houseId, limit: 500 });
  return unwrapList<Pen>(response.data);
}

/**
 * Drop any pen that does not belong to `farmId`, walking either side of the
 * chain: a pen matches when its owning house belongs to the farm, or when the
 * server stamped it with the farm directly. Union, not intersection — a
 * response filtered by the server is already scoped by `farmId`, while a
 * response from an older build is scoped by the house link.
 *
 * The house link is only trusted as far as the house itself checks out: a
 * house whose `farmId` names some other farm never admits its pens, even if it
 * slipped into the list we were handed. A house with no `farmId` at all (an
 * older payload) is assumed to have been fetched already scoped to the farm.
 */
export function scopePensToFarm(pens: Pen[], houses: PoultryHouse[], farmId: string): Pen[] {
  if (!farmId) return [];
  const housesById = new Map(houses.map((house) => [house.id, house]));
  return pens.filter((pen) => {
    if (pen.farmId === farmId) return true;
    const house = housesById.get(pen.poultryHouseId);
    if (!house) return false;
    return house.farmId ? house.farmId === farmId : true;
  });
}

/** Every pen under a farm, resolved through the houses loaded for that farm. */
export async function fetchPensForFarm(farmId: string, houses: PoultryHouse[]): Promise<Pen[]> {
  const response = await pensAPI.list({ farmId, limit: 500 });
  return scopePensToFarm(unwrapList<Pen>(response.data), houses, farmId);
}

/** The house a pen lives in, given everything already loaded. */
export function houseOfPen(
  penId: string,
  pens: Pen[],
  houses: PoultryHouse[]
): PoultryHouse | undefined {
  const pen = pens.find((candidate) => candidate.id === penId);
  if (!pen) return undefined;
  return houses.find((house) => house.id === pen.poultryHouseId);
}

export function toHouseOptions(houses: PoultryHouse[]): NameOption[] {
  return houses.map((house) => ({ id: house.id, name: house.name }));
}

/** Pens are labelled with their house so identically named pens stay apart. */
export function toPenOptions(pens: Pen[], houses: PoultryHouse[]): NameOption[] {
  const houseNames = new Map(houses.map((house) => [house.id, house.name]));
  return pens.map((pen) => {
    const houseName = houseNames.get(pen.poultryHouseId);
    return { id: pen.id, name: houseName ? `${pen.name} (${houseName})` : pen.name };
  });
}

/** The shared breed catalog. The server calls the species field `birdType`. */
export async function fetchBreedOptions(): Promise<NameOption[]> {
  const response = await breedsAPI.list({ limit: 500 });
  return unwrapList<Breed>(response.data).map((breed) => ({
    id: breed.id,
    name: breed.birdType ? `${breed.name} · ${breed.birdType}` : breed.name,
  }));
}
