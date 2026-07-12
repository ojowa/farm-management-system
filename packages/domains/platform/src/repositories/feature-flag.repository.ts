import { Repository, Id } from '@farm/domain-core';
import { FeatureFlag } from '../entities/feature-flag.entity';
import { FeatureFlagOverride } from '../entities/feature-flag-override.entity';

export interface FeatureFlagRepository extends Repository<FeatureFlag> {
  findByKey(key: string): Promise<FeatureFlag | null>;
  findByCategory(category: string): Promise<FeatureFlag[]>;
  findEnabled(): Promise<FeatureFlag[]>;
  findOverride(featureFlagId: string, organizationId: string): Promise<FeatureFlagOverride | null>;
  saveOverride(override: FeatureFlagOverride): Promise<void>;
  deleteOverride(id: Id): Promise<void>;
}
