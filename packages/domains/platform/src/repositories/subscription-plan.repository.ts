import { Repository } from '@farm/domain-core';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';

export interface SubscriptionPlanRepository extends Repository<SubscriptionPlan> {
  findByName(name: string): Promise<SubscriptionPlan | null>;
  findActive(): Promise<SubscriptionPlan[]>;
  findInactive(): Promise<SubscriptionPlan[]>;
  findSorted(): Promise<SubscriptionPlan[]>;
}
