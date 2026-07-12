import { Repository, Id, Email } from '@farm/domain-core';
import { User } from '../entities/user.entity';

export interface UserRepository extends Repository<User> {
  findByEmail(email: Email): Promise<User | null>;
  findByOrganizationId(organizationId: string): Promise<User[]>;
  findByRoleId(roleId: string): Promise<User[]>;
  existsByEmail(email: Email): Promise<boolean>;
}
