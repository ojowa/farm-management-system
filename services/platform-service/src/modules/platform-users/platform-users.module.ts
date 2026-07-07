import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformUsersController } from './platform-users.controller';
import { PlatformUsersService } from './platform-users.service';
import { PlatformAdminGuard, SuperAdminGuard } from '../../guards/platform-admin.guard';

@Module({
  imports: [ConfigModule],
  controllers: [PlatformUsersController],
  providers: [PlatformUsersService, PlatformAdminGuard, SuperAdminGuard],
})
export class PlatformUsersModule {}
