import { AggregateRoot, Id } from '@farm/domain-core';
import {
  FeatureFlagOverrideCreated,
  FeatureFlagOverrideUpdated,
} from '../events/platform-events';

export interface FeatureFlagOverrideProps {
  featureFlagId: string;
  organizationId: string;
  isEnabled: boolean;
}

export class FeatureFlagOverride extends AggregateRoot<FeatureFlagOverrideProps> {
  private constructor(id: Id, props: FeatureFlagOverrideProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: FeatureFlagOverrideProps
  ): FeatureFlagOverride {
    if (!props.featureFlagId || props.featureFlagId.trim().length === 0) {
      throw new Error('Feature flag ID is required');
    }
    if (!props.organizationId || props.organizationId.trim().length === 0) {
      throw new Error('Organization ID is required');
    }

    const override = new FeatureFlagOverride(id, {
      featureFlagId: props.featureFlagId,
      organizationId: props.organizationId,
      isEnabled: props.isEnabled,
    });

    override.addDomainEvent(
      new FeatureFlagOverrideCreated(id.toString(), {
        featureFlagId: props.featureFlagId,
        organizationId: props.organizationId,
        isEnabled: props.isEnabled,
      })
    );

    return override;
  }

  static reconstitute(id: Id, props: FeatureFlagOverrideProps): FeatureFlagOverride {
    return new FeatureFlagOverride(id, props);
  }

  get featureFlagId(): string {
    return this.props.featureFlagId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get isEnabled(): boolean {
    return this.props.isEnabled;
  }

  update(isEnabled: boolean): void {
    this.props.isEnabled = isEnabled;
    this.addDomainEvent(
      new FeatureFlagOverrideUpdated(this.id.toString(), {
        featureFlagId: this.props.featureFlagId,
        organizationId: this.props.organizationId,
        isEnabled,
      })
    );
  }
}
