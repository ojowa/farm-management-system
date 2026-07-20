import { Module } from '@nestjs/common';
import { NotificationController, DeviceController } from './presentation/controllers/notification.controller';
import { NotificationApplicationService } from './application/services/notification.service';
import { PrismaNotificationRepository, PrismaDeviceTokenRepository } from './infrastructure/persistence/prisma-notification.repository';
import { NotificationGateway } from './infrastructure/messaging/notification-gateway';
import { EmailModule } from './modules/email/email.module';
import { PushModule } from './modules/push/push.module';

@Module({
  imports: [EmailModule, PushModule],
  controllers: [NotificationController, DeviceController],
  providers: [
    NotificationApplicationService,
    NotificationGateway,
    { provide: 'NotificationRepository', useClass: PrismaNotificationRepository },
    { provide: 'DeviceTokenRepository', useClass: PrismaDeviceTokenRepository },
  ],
  exports: [NotificationApplicationService],
})
export class NotificationModule {}
