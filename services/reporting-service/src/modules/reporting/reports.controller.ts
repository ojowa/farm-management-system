import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ZodValidationPipe } from '@farm/utils';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get()
  async getAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];
    const filter: any = {};
    if (farmId) filter.farmId = farmId;
    if (search) filter.search = search;
    return this.reportingService.getAllReports(organizationId, filter, sortBy || 'createdAt', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];
    return this.reportingService.getReportById(id, organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any, @Req() req: any) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];
    return this.reportingService.createReport(data, organizationId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];
    return this.reportingService.updateReport(id, data, organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id'];
    return this.reportingService.deleteReport(id, organizationId);
  }
}
