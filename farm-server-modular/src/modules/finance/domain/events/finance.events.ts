export type FinanceEventType = 'created' | 'updated' | 'deleted';

export interface FinanceEvent<T = any> {
  type: FinanceEventType;
  entity: string;
  data: T;
  timestamp: Date;
}
