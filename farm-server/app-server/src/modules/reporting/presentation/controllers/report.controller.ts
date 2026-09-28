import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { prisma } from '@farm/database';
import { ReportApplicationService } from '../../application/services/report.service';

/** Titles used when the web console generates a report from a template. */
const TEMPLATE_TITLES: Record<string, string> = {
  'farm-summary': 'Farm Summary',
  'crop-report': 'Crop Report',
  'livestock-report': 'Livestock Report',
  'poultry-report': 'Poultry Report',
  'financial-report': 'Financial Report',
  'inventory-report': 'Inventory Report',
  'inventory': 'Inventory Report',
  'weather-summary': 'Weather Summary',
  'weather': 'Weather Summary',
  'finance': 'Financial Report',
  'hr': 'Workforce Report',
  'workforce': 'Workforce Report',
};

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportApplicationService) {}

  @Permission('reporting.read')
  @Get()
  async getAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
  ) {
    const organizationId = String(req.user?.organizationId || '');
    const result = await this.reportService.getAllReports(organizationId, {
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      farmId,
    });
    // Web clients read `payload.data.reports`.
    return { data: result };
  }

  @Permission('reporting.write')
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(@Req() req: any, @Body() body: { templateId?: string }) {
    const organizationId = String(req.user?.organizationId || '');
    const templateId = String(body?.templateId || '').trim();
    if (!templateId) throw new BadRequestException('templateId is required');

    const farms = await prisma.farm.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    const farmId = farms[0]?.id;
    if (!farmId) throw new BadRequestException('No farm available for this organization');

    const report = await this.reportService.createReport(
      {
        farmId,
        title: `${TEMPLATE_TITLES[templateId] || templateId} — ${new Date().toISOString().slice(0, 10)}`,
        status: 'completed',
        parameters: { templateId },
      },
      organizationId,
    );
    return { report, templateId };
  }

  @Permission('reporting.read')
  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    const organizationId = String(req.user?.organizationId || '');
    return this.reportService.getReportById(id, organizationId);
  }

  @Permission('reporting.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any, @Req() req: any) {
    const organizationId = String(req.user?.organizationId || '');
    return this.reportService.createReport(data, organizationId);
  }

  @Permission('reporting.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const organizationId = String(req.user?.organizationId || '');
    return this.reportService.updateReport(id, data, organizationId);
  }

  @Permission('reporting.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    const organizationId = String(req.user?.organizationId || '');
    return this.reportService.deleteReport(id, organizationId);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('schedule')
export class ScheduledReportController {
  constructor(private readonly reportService: ReportApplicationService) {}

  @Permission('reporting.read')
  @Get()
  async findAll(@Req() req: any) {
    return this.reportService.getAllScheduledReports(String(req.user?.organizationId || ''));
  }

  @Permission('reporting.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    return this.reportService.createScheduledReport({
      organizationId: String(req.user?.organizationId || ''),
      name: body.name,
      template: body.template,
      recipients: body.recipients,
      frequency: body.frequency,
    });
  }

  @Permission('reporting.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.reportService.updateScheduledReport(id, body);
  }

  @Permission('reporting.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.reportService.deleteScheduledReport(id);
  }
}
