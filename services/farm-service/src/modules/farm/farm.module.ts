import { Module } from '@nestjs/common';
import { FarmController } from './farm.controller';
import { FieldController } from './field.controller';
import { ImportExportController } from './import-export.controller';
import { MapController } from './map.controller';
import { FarmService } from './farm.service';
import { FarmRepository } from './farm.repository';
import { FarmEventService } from './farm.event.service';

@Module({
  controllers: [FarmController, FieldController, ImportExportController, MapController],
  providers: [FarmService, FarmRepository, FarmEventService],
  exports: [FarmService],
})
export class FarmModule {}
