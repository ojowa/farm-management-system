import { AggregateRoot, Id } from '@farm/domain-core';
import {
  FeatureFlagCreated,
  FeatureFlagToggled,
  FeatureFlagUpdated,
} from '../events/platform-events';

export interface FeatureFlagProps {
  key: string;
  name: string;
  description: string | null;
  category: string;
  defaultValue: boolean;
  isEnabled: boolean;
}

export class FeatureFlag extends AggregateRoot<FeatureFlagProps> {
  private constructor(id: Id, props: FeatureFlagProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: Omit<FeatureFlagProps, 'isEnabled'> & { isEnabled?: boolean }
  ): FeatureFlag {
    if (!props.key || props.key.trim().length === 0) {
      throw new Error('Key is required');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (!props.category || props.category.trim().length === 0) {
      throw new Error('Category is required');
    }

    const featureFlag = new FeatureFlag(id, {
      key: props.key.trim(),
      name: props.name.trim(),
      description: props.description ?? null,
      category: props.category.trim(),
      defaultValue: props.defaultValue,
      isEnabled: props.isEnabled ?? props.defaultValue,
    });

    featureFlag.addDomainEvent(
      new FeatureFlagCreated(id.toString(), {
        key: props.key,
        name: props.name,
        category: props.category,
      })
    );

    return featureFlag;
  }

  static reconstitute(id: Id, props: FeatureFlagProps): FeatureFlag {
    return new FeatureFlag(id, props);
  }

  get key(): string {
    return this.props.key;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  get defaultValue(): boolean {
    return this.props.defaultValue;
  }

  get isEnabled(): boolean {
    return this.props.isEnabled;
  }

  toggle(): void {
    this.props.isEnabled = !this.props.isEnabled;
    this.addDomainEvent(
      new FeatureFlagToggled(this.id.toString(), {
        key: this.props.key,
        isEnabled: this.props.isEnabled,
      })
    );
  }

  update(data: {
    name?: string;
    description?: string | null;
    category?: string;
    defaultValue?: boolean;
  }): void {
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error('Name cannot be empty');
      }
      this.props.name = data.name.trim();
    }
    if (data.description !== undefined) {
      this.props.description = data.description;
    }
    if (data.category !== undefined) {
      if (data.category.trim().length === 0) {
        throw new Error('Category cannot be empty');
      }
      this.props.category = data.category.trim();
    }
    if (data.defaultValue !== undefined) {
      this.props.defaultValue = data.defaultValue;
    }

    this.addDomainEvent(
      new FeatureFlagUpdated(this.id.toString(), {
        key: this.props.key,
        changes: data,
      })
    );
  }
}
