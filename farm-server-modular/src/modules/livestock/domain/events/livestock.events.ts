import { Livestock } from '../entities/livestock.entity';

export interface LivestockDomainEvent {
  type: 'created' | 'updated' | 'deleted';
  payload: Livestock | { id: string };
  timestamp: Date;
}

export function createLivestockEvent(
  type: LivestockDomainEvent['type'],
  payload: LivestockDomainEvent['payload'],
): LivestockDomainEvent {
  return {
    type,
    payload,
    timestamp: new Date(),
  };
}
