import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { FarmController, FieldController } from './presentation/controllers/farm.controller';
import { FarmApplicationService } from './application/services/farm.service';
import { PrismaFarmRepository, PrismaFieldRepository } from './infrastructure/persistence/prisma-farm.repository';
import { FarmEventService } from './infrastructure/messaging/farm.event.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
  controllers: [FarmController, FieldController],
  providers: [
    FarmApplicationService,
    FarmEventService,
    { provide: 'FarmRepository', useClass: PrismaFarmRepository },
    { provide: 'FieldRepository', useClass: PrismaFieldRepository },
  ],
})
export class AppModule {}
