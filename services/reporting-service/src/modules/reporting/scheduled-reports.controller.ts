import { Injectable, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

function calculateNextSend(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'DAILY': now.setDate(now.getDate() + 1); break;
    case 'WEEKLY': now.setDate(now.getDate() + 7); break;
    case 'MONTHLY': now.setMonth(now.getMonth() + 1); break;
    case 'QUARTERLY': now.setMonth(now.getMonth() + 3); break;
  }
  return now;
}

@Injectable()
export class ScheduledReportsController {
  @Get()
  async findAll(@Query('organizationId') orgId: string) {
    return scopedPrisma.scheduledReport.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @Query('organizationId') orgId: string) {
    const { name, template, recipients, frequency } = body;
    return scopedPrisma.scheduledReport.create({
      data: {
        organizationId: orgId, name, template,
        recipients: recipients || [], frequency,
        nextSend: calculateNextSend(frequency),
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.template !== undefined) updateData.template = body.template;
    if (body.recipients !== undefined) updateData.recipients = body.recipients;
    if (body.frequency !== undefined) { updateData.frequency = body.frequency; updateData.nextSend = calculateNextSend(body.frequency); }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    return scopedPrisma.scheduledReport.update({ where: { id }, data: updateData });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await scopedPrisma.scheduledReport.delete({ where: { id } });
  }
}
