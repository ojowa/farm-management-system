import { Module } from '@nestjs/common';
import { FarmController, FieldController } from './presentation/controllers/farm.controller';
import { FarmApplicationService } from './application/services/farm.service';
import { PrismaFarmRepository, PrismaFieldRepository } from './infrastructure/persistence/prisma-farm.repository';
import { FarmEventService } from './infrastructure/messaging/farm.event.service';

@Module({
  controllers: [FarmController, FieldController],
  providers: [
    FarmApplicationService,
    FarmEventService,
    { provide: 'FarmRepository', useClass: PrismaFarmRepository },
    { provide: 'FieldRepository', useClass: PrismaFieldRepository },
  ],
  exports: [FarmApplicationService],
})
export class FarmModule {}
