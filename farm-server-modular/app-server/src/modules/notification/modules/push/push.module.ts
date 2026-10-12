import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { PrismaDeviceTokenRepository } from '../../infrastructure/persistence/prisma-notification.repository';

@Module({
  providers: [
    PushService,
    { provide: 'DeviceTokenRepository', useClass: PrismaDeviceTokenRepository },
  ],
  exports: [PushService],
})
export class PushModule {}
