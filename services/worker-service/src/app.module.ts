import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { WorkerController } from './presentation/controllers/worker.controller';
import { WorkerApplicationService } from './application/services/worker.service';
import { PrismaWorkerRepository } from './infrastructure/persistence/prisma-worker.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
  controllers: [WorkerController],
  providers: [
    WorkerApplicationService,
    { provide: 'WorkerRepository', useClass: PrismaWorkerRepository },
  ],
})
export class AppModule {}
