import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformFeaturesController } from './platform-features.controller';
import { PlatformFeaturesService } from './platform-features.service';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';

@Module({
  imports: [ConfigModule],
  controllers: [PlatformFeaturesController],
  providers: [PlatformFeaturesService, PlatformAdminGuard],
})
export class PlatformFeaturesModule {}
