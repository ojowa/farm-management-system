import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { LowStockController } from './low-stock.controller';
import { ImportExportController } from './import-export.controller';
import { EquipmentController } from './equipment.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';

@Module({
  controllers: [InventoryController, LowStockController, ImportExportController, EquipmentController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService],
})
export class InventoryModule {}
