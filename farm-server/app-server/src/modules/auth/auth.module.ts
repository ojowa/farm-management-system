import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './presentation/controllers/auth.controller';
import { RolesController } from './presentation/controllers/roles.controller';
import { PermissionsController } from './presentation/controllers/permissions.controller';
import { AdminController } from './presentation/controllers/admin.controller';
import { AdminUsersController } from './presentation/controllers/admin-users.controller';
import { OrgAdminController } from './presentation/controllers/org-admin.controller';
import { ApiKeysController } from './presentation/controllers/api-keys.controller';
import { PlatformRolesController } from './presentation/controllers/platform-roles.controller';
import { PlatformPermissionsController } from './presentation/controllers/platform-permissions.controller';
import { PlatformApiKeysController } from './presentation/controllers/platform-api-keys.controller';
import { AuthService } from './application/services/auth.service';
import { RolesService } from './application/services/roles.service';
import { PermissionsService } from './application/services/permissions.service';
import { AdminService } from './application/services/admin.service';
import { OrgAdminService } from './application/services/org-admin.service';
import { ApiKeysService } from './application/services/api-keys.service';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma-role.repository';
import { PrismaOrganizationRepository } from './infrastructure/persistence/prisma-organization.repository';

@Module({
  imports: [
    // Only the 'default' throttler is registered. Named throttlers declared
    // here (previously 'auth' and '2fa') apply to EVERY route unless a route
    // explicitly skips them by name, and bare @SkipThrottle() only skips
    // 'default' — so the extra named throttlers were silently capping routes
    // like /auth/me at 5 hits/5min for all users at once.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: Number(process.env.RATE_LIMIT_DEFAULT_TTL_MS) || 60000, limit: Number(process.env.RATE_LIMIT_DEFAULT_LIMIT) || 30 },
    ]),
  ],
  controllers: [
    AuthController,
    RolesController,
    PermissionsController,
    AdminController,
    AdminUsersController,
    OrgAdminController,
    ApiKeysController,
    PlatformRolesController,
    PlatformPermissionsController,
    PlatformApiKeysController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AuthService,
    RolesService,
    PermissionsService,
    AdminService,
    OrgAdminService,
    ApiKeysService,
    { provide: 'UserRepository', useClass: PrismaUserRepository },
    { provide: 'RefreshTokenRepository', useClass: PrismaRefreshTokenRepository },
    { provide: 'RoleRepository', useClass: PrismaRoleRepository },
    { provide: 'OrganizationRepository', useClass: PrismaOrganizationRepository },
  ],
  exports: [AuthService, RolesService, PermissionsService],
})
export class AuthModule {}
