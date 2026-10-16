import { Module } from '@nestjs/common';
import { AquacultureController } from './presentation/controllers/aquaculture.controller';
import { AquacultureApplicationService } from './application/services/aquaculture.service';
import { PrismaAquacultureRepository } from './infrastructure/persistence/prisma-aquaculture.repository';

@Module({
  controllers: [AquacultureController],
  providers: [
    AquacultureApplicationService,
    { provide: 'AquacultureRepository', useClass: PrismaAquacultureRepository },
  ],
  exports: [AquacultureApplicationService],
})
export class AquacultureModule {}
