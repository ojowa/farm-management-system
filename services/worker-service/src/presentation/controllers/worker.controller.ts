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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { WorkerApplicationService } from '../../application/services/worker.service';
import { ZodValidationPipe } from '@farm/utils';
import { createWorkerSchema, updateWorkerSchema } from '@farm/validation';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('workers')
export class WorkerController {
  constructor(private readonly workerService: WorkerApplicationService) {}

  @Permission('hr.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createWorkerSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: { farmId: string; name: string; role: string }) {
    return this.workerService.createWorker(data);
  }

  @Permission('hr.read')
  @Get()
  async findAll() {
    return this.workerService.getAllWorkers();
  }

  @Permission('hr.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workerService.getWorkerById(id);
  }

  @Permission('hr.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateWorkerSchema))
  async update(@Param('id') id: string, @Body() data: { farmId?: string; name?: string; role?: string }) {
    return this.workerService.updateWorker(id, data);
  }

  @Permission('hr.write')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.workerService.deleteWorker(id);
  }
}
