import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkerService } from './worker.service';
import { ZodValidationPipe } from '@farm/utils';
import { createWorkerSchema, updateWorkerSchema } from '@farm/validation';

@Controller('workers')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createWorkerSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: { farmId: string; name: string; role: string }) {
    return this.workerService.createWorker(data);
  }

  @Get()
  async findAll() {
    return this.workerService.getAllWorkers();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workerService.getWorkerById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateWorkerSchema))
  async update(@Param('id') id: string, @Body() data: { farmId?: string; name?: string; role?: string }) {
    return this.workerService.updateWorker(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.workerService.deleteWorker(id);
  }
}
