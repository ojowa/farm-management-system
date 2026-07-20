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
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';
import { ReportApplicationService } from '../../application/services/report.service';

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
    return this.reportService.getAllReports(organizationId, {
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      farmId,
    });
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
