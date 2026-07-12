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
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { OrganizationApplicationService } from '../../application/services/organization.service';
import { Organization } from '../../domain/entities/organization.entity';
import { ZodValidationPipe } from '@farm/utils';
import { createOrganizationSchema, updateOrganizationSchema } from '@farm/validation';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationApplicationService) {}

  @Permission('organization.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createOrganizationSchema))
  async create(@Body() createDto: any): Promise<Organization> {
    return this.organizationService.create(createDto);
  }

  @Permission('organization.read')
  @Get('subscription-plans')
  async getSubscriptionPlans() {
    return this.organizationService.getSubscriptionPlans();
  }

  @Permission('organization.read')
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Organization> {
    return this.organizationService.findOne(id);
  }

  @Permission('organization.read')
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Organization | null> {
    return this.organizationService.findBySlug(slug);
  }

  @Permission('organization.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateOrganizationSchema))
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<Organization>
  ): Promise<Organization> {
    return this.organizationService.update(id, updateDto);
  }

  @Permission('organization.write')
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.organizationService.delete(id);
  }

  @Permission('organization.read')
  @Get()
  async findAll(): Promise<Organization[]> {
    return this.organizationService.findAll();
  }
}
