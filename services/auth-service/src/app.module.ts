import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AuthController } from './presentation/controllers/auth.controller';
import { RolesController } from './presentation/controllers/roles.controller';
import { PermissionsController } from './presentation/controllers/permissions.controller';
import { AdminController } from './presentation/controllers/admin.controller';
import { OrgAdminController } from './presentation/controllers/org-admin.controller';
import { ApiKeysController } from './presentation/controllers/api-keys.controller';
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
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
  controllers: [
    AuthController,
    RolesController,
    PermissionsController,
    AdminController,
    OrgAdminController,
    ApiKeysController,
  ],
  providers: [
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
})
export class AppModule {}
