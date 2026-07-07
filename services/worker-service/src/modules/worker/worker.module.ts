import { Module } from '@nestjs/common';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { WorkerRepository } from './worker.repository';

@Module({
  controllers: [WorkerController],
  providers: [WorkerService, WorkerRepository],
  exports: [WorkerService],
})
export class WorkerModule {}
