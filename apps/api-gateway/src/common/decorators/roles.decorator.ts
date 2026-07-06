import { SetMetadata } from '@nestjs/common';

/**
 * @deprecated No-op decorator. Auth has been removed.
 */
export const ROLES_KEY = 'farm:roles:legacy';
export const Roles = (..._roles: string[]) => SetMetadata(ROLES_KEY, []);
