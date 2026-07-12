import { Repository, Id } from '@farm/domain-core';
import { Role } from '../entities/role.entity';

export interface RoleRepository extends Repository<Role> {
  findByName(name: string, organizationId: string | null): Promise<Role | null>;
  findByOrganizationId(organizationId: string): Promise<Role[]>;
  findSystemRoles(): Promise<Role[]>;
  existsByName(name: string, organizationId: string | null): Promise<boolean>;
}
