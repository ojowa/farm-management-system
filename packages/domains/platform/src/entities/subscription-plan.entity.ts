import { AggregateRoot, Id } from '@farm/domain-core';
import {
  SubscriptionPlanCreated,
  SubscriptionPlanUpdated,
  SubscriptionPlanDeactivated,
} from '../events/platform-events';

export interface SubscriptionPlanProps {
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  maxFarms: number;
  maxStorage: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export class SubscriptionPlan extends AggregateRoot<SubscriptionPlanProps> {
  private constructor(id: Id, props: SubscriptionPlanProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: Omit<SubscriptionPlanProps, 'isActive'> & { isActive?: boolean }
  ): SubscriptionPlan {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (!props.displayName || props.displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }
    if (!props.currency || props.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
    if (!props.billingCycle || props.billingCycle.trim().length === 0) {
      throw new Error('Billing cycle is required');
    }
    if (props.price < 0) {
      throw new Error('Price cannot be negative');
    }

    const plan = new SubscriptionPlan(id, {
      name: props.name.trim(),
      displayName: props.displayName.trim(),
      description: props.description ?? null,
      price: props.price,
      currency: props.currency.trim().toUpperCase(),
      billingCycle: props.billingCycle.trim(),
      maxUsers: props.maxUsers,
      maxFarms: props.maxFarms,
      maxStorage: props.maxStorage,
      features: props.features ?? [],
      isActive: props.isActive ?? true,
      sortOrder: props.sortOrder ?? 0,
    });

    plan.addDomainEvent(
      new SubscriptionPlanCreated(id.toString(), {
        name: props.name,
        price: props.price,
        currency: props.currency,
      })
    );

    return plan;
  }

  static reconstitute(id: Id, props: SubscriptionPlanProps): SubscriptionPlan {
    return new SubscriptionPlan(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get description(): string | null {
    return this.props.description;
  }

  get price(): number {
    return this.props.price;
  }

  get currency(): string {
    return this.props.currency;
  }

  get billingCycle(): string {
    return this.props.billingCycle;
  }

  get maxUsers(): number {
    return this.props.maxUsers;
  }

  get maxFarms(): number {
    return this.props.maxFarms;
  }

  get maxStorage(): number {
    return this.props.maxStorage;
  }

  get features(): string[] {
    return this.props.features;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  update(data: {
    displayName?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    billingCycle?: string;
    maxUsers?: number;
    maxFarms?: number;
    maxStorage?: number;
    features?: string[];
    sortOrder?: number;
  }): void {
    if (data.displayName !== undefined) {
      if (data.displayName.trim().length === 0) {
        throw new Error('Display name cannot be empty');
      }
      this.props.displayName = data.displayName.trim();
    }
    if (data.description !== undefined) {
      this.props.description = data.description;
    }
    if (data.price !== undefined) {
      if (data.price < 0) {
        throw new Error('Price cannot be negative');
      }
      this.props.price = data.price;
    }
    if (data.currency !== undefined) {
      if (data.currency.trim().length === 0) {
        throw new Error('Currency cannot be empty');
      }
      this.props.currency = data.currency.trim().toUpperCase();
    }
    if (data.billingCycle !== undefined) {
      if (data.billingCycle.trim().length === 0) {
        throw new Error('Billing cycle cannot be empty');
      }
      this.props.billingCycle = data.billingCycle.trim();
    }
    if (data.maxUsers !== undefined) {
      this.props.maxUsers = data.maxUsers;
    }
    if (data.maxFarms !== undefined) {
      this.props.maxFarms = data.maxFarms;
    }
    if (data.maxStorage !== undefined) {
      this.props.maxStorage = data.maxStorage;
    }
    if (data.features !== undefined) {
      this.props.features = data.features;
    }
    if (data.sortOrder !== undefined) {
      this.props.sortOrder = data.sortOrder;
    }

    this.addDomainEvent(
      new SubscriptionPlanUpdated(this.id.toString(), {
        name: this.props.name,
        changes: data,
      })
    );
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new Error('Subscription plan is already deactivated');
    }
    this.props.isActive = false;
    this.addDomainEvent(
      new SubscriptionPlanDeactivated(this.id.toString(), {
        name: this.props.name,
      })
    );
  }
}
