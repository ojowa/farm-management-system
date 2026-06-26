import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { CreateOrganizationRequest, Organization } from '@farm/types';
import { ZodValidationPipe } from '@farm/utils';
import { createOrganizationSchema, updateOrganizationSchema } from '@farm/validation';
import {
  AuthorizationGuard,
  JwtAuthGuard,
  Roles,
  Permission,
} from '@farm/auth';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // Public-ish: registration happens through the auth-service which then
  // creates the org. This endpoint is reserved for support / import flows.
  @Post()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Roles('SUPER_ADMIN', 'SUPPORT_ADMIN')
  @UsePipes(new ZodValidationPipe(createOrganizationSchema))
  async create(@Body() createDto: CreateOrganizationRequest): Promise<Organization> {
    return this.organizationService.create(createDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Permission('organization.read')
  async findOne(@Param('id') id: string): Promise<Organization> {
    return this.organizationService.findOne(id);
  }

  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Permission('organization.read')
  async findBySlug(@Param('slug') slug: string): Promise<Organization | null> {
    return this.organizationService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Roles('ORGANIZATION_OWNER', 'SUPER_ADMIN')
  @Permission('organization.write')
  @UsePipes(new ZodValidationPipe(updateOrganizationSchema))
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<Organization>
  ): Promise<Organization> {
    return this.organizationService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Roles('ORGANIZATION_OWNER', 'SUPER_ADMIN')
  @Permission('organization.delete')
  async delete(@Param('id') id: string): Promise<void> {
    return this.organizationService.delete(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Roles('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORGANIZATION_OWNER')
  async findAll(): Promise<Organization[]> {
    return this.organizationService.findAll();
  }
}
