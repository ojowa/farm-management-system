"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userHasAnyRole = exports.roleHasPermission = exports.ROLE_PERMISSIONS = exports.ROLES = void 0;
/**
 * Canonical role names. The auth-service is the only place allowed to assign
 * these to a user; every downstream service imports the same constants so a
 * rename is a single-line change.
 *
 * Keep these in sync with `prisma/seed.ts` in `@farm/database`.
 */
exports.ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    SUPPORT_ADMIN: 'SUPPORT_ADMIN',
    ORGANIZATION_OWNER: 'ORGANIZATION_OWNER',
    FARM_MANAGER: 'FARM_MANAGER',
    ACCOUNTANT: 'ACCOUNTANT',
    SUPERVISOR: 'SUPERVISOR',
    VETERINARIAN: 'VETERINARIAN',
    WORKER: 'WORKER',
};
/**
 * A coarse-grained authorization matrix grouped by domain. Services should
 * pick the role set that matches their surface (e.g. workers can read farms
 * but cannot delete them). Roles not listed here implicitly have no access.
 */
exports.ROLE_PERMISSIONS = {
    // Cross-cutting / platform level
    SUPER_ADMIN: ['*'],
    SUPPORT_ADMIN: ['*.read'],
    // Organization-wide authority
    ORGANIZATION_OWNER: [
        'farm.read',
        'farm.write',
        'farm.delete',
        'crop.read',
        'crop.write',
        'crop.delete',
        'livestock.read',
        'livestock.write',
        'livestock.delete',
        'poultry.read',
        'poultry.write',
        'poultry.delete',
        'inventory.read',
        'inventory.write',
        'inventory.delete',
        'finance.read',
        'finance.write',
        'finance.delete',
        'worker.read',
        'worker.write',
        'worker.delete',
        'notification.read',
        'notification.write',
        'reporting.read',
        'reporting.write',
        'organization.read',
        'organization.write',
        'organization.delete',
        'organization.manage',
        'users.manage',
        'billing.manage',
    ],
    // Domain managers
    FARM_MANAGER: [
        'farm.read',
        'farm.write',
        'farm.delete',
        'crop.read',
        'crop.write',
        'crop.delete',
        'livestock.read',
        'livestock.write',
        'livestock.delete',
        'poultry.read',
        'poultry.write',
        'poultry.delete',
        'inventory.read',
        'inventory.write',
        'worker.read',
        'worker.write',
        'finance.read',
        'finance.write',
        'notification.read',
        'reporting.read',
    ],
    ACCOUNTANT: [
        'finance.read',
        'finance.write',
        'farm.read',
        'inventory.read',
        'reporting.read',
    ],
    SUPERVISOR: [
        'farm.read',
        'crop.read',
        'crop.write',
        'livestock.read',
        'livestock.write',
        'poultry.read',
        'poultry.write',
        'worker.read',
        'worker.write',
        'notification.read',
        'reporting.read',
    ],
    VETERINARIAN: [
        'livestock.read',
        'livestock.write',
        'livestock.delete',
        'poultry.read',
        'poultry.write',
        'farm.read',
        'notification.read',
    ],
    // Field operators
    WORKER: [
        'farm.read',
        'crop.read',
        'livestock.read',
        'poultry.read',
        'inventory.read',
        'worker.read',
        'notification.read',
    ],
};
const WILDCARD = '*';
const matches = (granted, required) => {
    if (granted === WILDCARD) {
        return true;
    }
    if (granted === required) {
        return true;
    }
    if (granted.endsWith('.*')) {
        const prefix = granted.slice(0, -2);
        return required === prefix || required.startsWith(`${prefix}.`);
    }
    return false;
};
/**
 * Returns true if the role grants the required permission. SUPER_ADMIN and
 * platform-wide wildcards short-circuit to true.
 */
const roleHasPermission = (role, permission) => {
    const grants = exports.ROLE_PERMISSIONS[role];
    if (!grants) {
        return false;
    }
    return grants.some((g) => matches(g, permission));
};
exports.roleHasPermission = roleHasPermission;
/**
 * Returns true if the user has at least one of the listed roles.
 */
const userHasAnyRole = (userRole, allowed) => {
    if (!userRole || allowed.length === 0) {
        return false;
    }
    return allowed.includes(userRole);
};
exports.userHasAnyRole = userHasAnyRole;
