import { Controller, Get, Post, Put, Body, Param, UsePipes } from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { CreateOrganizationRequest, Organization } from '@farm/types';
import { ZodValidationPipe } from '@farm/utils'; // I should make sure this is exported in utils
import { createOrganizationSchema, updateOrganizationSchema } from '@farm/validation';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createOrganizationSchema))
  async create(@Body() createDto: CreateOrganizationRequest): Promise<Organization> {
    return this.organizationService.create(createDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Organization> {
    return this.organizationService.findOne(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateOrganizationSchema))
  async update(
    @Param('id') id: string,
    @Body() updateDto: any
  ): Promise<Organization> {
    return this.organizationService.update(id, updateDto);
  }

  @Get()
  async findAll(): Promise<Organization[]> {
    return this.organizationService.findAll();
  }
}
