import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UsePipes,
} from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { CreateOrganizationRequest, Organization } from '@farm/types';
import { ZodValidationPipe } from '@farm/utils';
import { createOrganizationSchema, updateOrganizationSchema } from '@farm/validation';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // Public-ish: registration happens through the auth-service which then
  // creates the org. This endpoint is reserved for support / import flows.
  @Post()
  @UsePipes(new ZodValidationPipe(createOrganizationSchema))
  async create(@Body() createDto: CreateOrganizationRequest): Promise<Organization> {
    return this.organizationService.create(createDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Organization> {
    return this.organizationService.findOne(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Organization | null> {
    return this.organizationService.findBySlug(slug);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateOrganizationSchema))
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<Organization>
  ): Promise<Organization> {
    return this.organizationService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.organizationService.delete(id);
  }

  @Get()
  async findAll(): Promise<Organization[]> {
    return this.organizationService.findAll();
  }
}
