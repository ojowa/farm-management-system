export interface PoultryEvent {
  eventType: 'created' | 'updated' | 'deleted';
  entityType: string;
  data: Record<string, unknown>;
  timestamp: Date;
}
