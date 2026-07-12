import { Repository, Id, Email } from '@farm/domain-core';
import { Organization } from '../entities/organization.entity';

export interface OrganizationRepository extends Repository<Organization> {
  findBySlug(slug: string): Promise<Organization | null>;
  findByEmail(email: Email): Promise<Organization | null>;
  existsBySlug(slug: string): Promise<boolean>;
  existsByEmail(email: Email): Promise<boolean>;
}
