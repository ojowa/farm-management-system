import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';

@Module({
  imports: [ConfigModule],
  controllers: [PlatformAuthController],
  providers: [PlatformAuthService],
  exports: [PlatformAuthService],
})
export class PlatformAuthModule {}
