import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '../../../../kernel/auth/nestjs';
import { OrganizationApplicationService } from '../../application/services/organization.service';
import { Organization } from '../../domain/entities/organization.entity';
import { ZodValidationPipe } from '../../../../kernel/utils';
import { createOrganizationSchema, updateOrganizationSchema } from '../../../../kernel/validation';

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
  async findOne(@Param('id') id: string, @Req() req: any): Promise<Organization> {
    return this.organizationService.findOne(id, String(req.user?.organizationId || ''));
  }

  @Permission('organization.read')
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string, @Req() req: any): Promise<Organization | null> {
    return this.organizationService.findBySlug(slug, String(req.user?.organizationId || ''));
  }

  @Permission('organization.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateOrganizationSchema))
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: Partial<Organization>
  ): Promise<Organization> {
    return this.organizationService.update(id, String(req.user?.organizationId || ''), updateDto);
  }

  @Permission('organization.write')
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.organizationService.delete(id, String(req.user?.organizationId || ''));
  }

  @Permission('organization.read')
  @Get()
  async findAll(@Req() req: any): Promise<Organization[]> {
    return this.organizationService.findAll(String(req.user?.organizationId || ''));
  }
}
