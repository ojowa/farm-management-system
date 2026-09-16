import { Module } from '@nestjs/common';
import { FarmController, FieldController } from './presentation/controllers/farm.controller';
import { DocumentsController, InventoryController, EquipmentController } from './presentation/controllers/asset.controller';
import { FarmApplicationService } from './application/services/farm.service';
import { PrismaFarmRepository, PrismaFieldRepository } from './infrastructure/persistence/prisma-farm.repository';
import { FarmEventService } from './infrastructure/messaging/farm.event.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [FarmController, FieldController, DocumentsController, InventoryController, EquipmentController],
  providers: [
    FarmApplicationService,
    FarmEventService,
    { provide: 'FarmRepository', useClass: PrismaFarmRepository },
    { provide: 'FieldRepository', useClass: PrismaFieldRepository },
  ],
  exports: [FarmApplicationService],
})
export class FarmModule {}
