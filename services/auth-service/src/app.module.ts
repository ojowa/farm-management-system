import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AdminModule } from './modules/admin/admin.module';
import { OrgAdminModule } from './modules/org-admin/org-admin.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    AuthModule,
    RolesModule,
    PermissionsModule,
    AdminModule,
    OrgAdminModule,
    ApiKeysModule,
  ],
})
export class AppModule {}
