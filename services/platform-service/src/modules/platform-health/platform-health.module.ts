import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformHealthController } from './platform-health.controller';
import { PlatformHealthService } from './platform-health.service';

@Module({
  imports: [ConfigModule],
  controllers: [PlatformHealthController],
  providers: [PlatformHealthService],
})
export class PlatformHealthModule {}
