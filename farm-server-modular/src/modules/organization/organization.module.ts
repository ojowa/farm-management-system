import { Module } from '@nestjs/common';
import { OrganizationController } from './presentation/controllers/organization.controller';
import { DeletedDataController } from './presentation/controllers/deleted-data.controller';
import { OrganizationApplicationService } from './application/services/organization.service';
import { PrismaOrganizationRepository } from './infrastructure/persistence/prisma-organization.repository';

@Module({
  controllers: [OrganizationController, DeletedDataController],
  providers: [
    OrganizationApplicationService,
    { provide: 'OrganizationRepository', useClass: PrismaOrganizationRepository },
  ],
  exports: [OrganizationApplicationService],
})
export class OrganizationModule {}
