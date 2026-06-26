import { SetMetadata } from '@nestjs/common';

/**
 * @deprecated Use `Roles`/`Permission` from `@farm/auth` instead. Kept here
 * to avoid breaking existing imports while downstream services migrate.
 */
export const ROLES_KEY = 'farm:roles:legacy';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
