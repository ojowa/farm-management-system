import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageSettingsService } from './storage-settings.service';

@Global()
@Module({
  providers: [StorageSettingsService, StorageService],
  exports: [StorageSettingsService, StorageService],
})
export class StorageModule {}
