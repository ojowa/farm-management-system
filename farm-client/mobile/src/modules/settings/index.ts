/**
 * Settings module — organization profile, admin settings and the
 * subscription/billing surface. These are core (non plan-gated) System
 * concerns, matching the admin portal's "System" section.
 */
export { organizationsAPI, orgAdminAPI, subscriptionAPI } from '../../services/api';
export type { Organization, User } from '../../services/types';
