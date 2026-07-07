import { Module } from '@nestjs/common';
import { CorrespondenceController } from './correspondence.controller';

@Module({
  controllers: [CorrespondenceController],
})
export class CorrespondenceModule {}
