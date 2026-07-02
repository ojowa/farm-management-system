import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { OrganizationModule } from './modules/organization/organization.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '..', '..', '.env') }),
    OrganizationModule,
  ],
})
export class AppModule {}
