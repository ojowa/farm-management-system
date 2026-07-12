import { AggregateRoot, Id } from '@farm/domain-core';
import { PlatformConfigCreated, PlatformConfigUpdated } from '../events/platform-events';

export interface PlatformConfigProps {
  key: string;
  value: string;
  description: string | null;
  category: string;
}

export class PlatformConfig extends AggregateRoot<PlatformConfigProps> {
  private constructor(id: Id, props: PlatformConfigProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: PlatformConfigProps
  ): PlatformConfig {
    if (!props.key || props.key.trim().length === 0) {
      throw new Error('Key is required');
    }
    if (props.value === undefined || props.value === null) {
      throw new Error('Value is required');
    }
    if (!props.category || props.category.trim().length === 0) {
      throw new Error('Category is required');
    }

    const config = new PlatformConfig(id, {
      key: props.key.trim(),
      value: props.value,
      description: props.description ?? null,
      category: props.category.trim(),
    });

    config.addDomainEvent(
      new PlatformConfigCreated(id.toString(), {
        key: props.key,
        category: props.category,
      })
    );

    return config;
  }

  static reconstitute(id: Id, props: PlatformConfigProps): PlatformConfig {
    return new PlatformConfig(id, props);
  }

  get key(): string {
    return this.props.key;
  }

  get value(): string {
    return this.props.value;
  }

  get description(): string | null {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  update(data: { value?: string; description?: string | null }): void {
    if (data.value !== undefined) {
      const previousValue = this.props.value;
      this.props.value = data.value;
      this.addDomainEvent(
        new PlatformConfigUpdated(this.id.toString(), {
          key: this.props.key,
          previousValue,
          newValue: data.value,
        })
      );
    }
    if (data.description !== undefined) {
      this.props.description = data.description;
    }
  }
}
