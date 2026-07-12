import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { CropController, CropCycleController } from './presentation/controllers/crop.controller';
import { CropApplicationService } from './application/services/crop.service';
import { PrismaCropRepository, PrismaCropCycleRepository } from './infrastructure/persistence/prisma-crop.repository';
import { CropEventService } from './infrastructure/messaging/crop.event.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
  controllers: [CropController, CropCycleController],
  providers: [
    CropApplicationService,
    CropEventService,
    { provide: 'CropRepository', useClass: PrismaCropRepository },
    { provide: 'CropCycleRepository', useClass: PrismaCropCycleRepository },
  ],
})
export class AppModule {}
