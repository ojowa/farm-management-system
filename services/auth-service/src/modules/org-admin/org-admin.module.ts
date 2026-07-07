import { Module } from '@nestjs/common';
import { OrgAdminController } from './org-admin.controller';

@Module({ controllers: [OrgAdminController] })
export class OrgAdminModule {}
