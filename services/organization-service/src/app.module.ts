import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { OrganizationController } from './presentation/controllers/organization.controller';
import { OrganizationApplicationService } from './application/services/organization.service';
import { PrismaOrganizationRepository } from './infrastructure/persistence/prisma-organization.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
  ],
  controllers: [OrganizationController],
  providers: [
    OrganizationApplicationService,
    { provide: 'OrganizationRepository', useClass: PrismaOrganizationRepository },
  ],
})
export class AppModule {}
