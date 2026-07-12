import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('contracts')
export class ContractController {
  @Permission('finance.read')
  @Get()
  async findAll(@Query('type') type?: string, @Query('status') status?: string, @Query('organizationId') orgId?: string) {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (type) where.type = type;
    if (status) where.status = status;
    return scopedPrisma.contract.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  @Permission('finance.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @Query('organizationId') orgId?: string) {
    const { type, buyerSellerName, entityId, entityType, startDate, endDate, value, terms } = body;
    return scopedPrisma.contract.create({
      data: {
        organizationId: orgId || '', type, buyerSellerName,
        entityId: entityId || null, entityType: entityType || null,
        startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null,
        value: Number(value), terms: terms?.trim() || null,
      },
    });
  }

  @Permission('finance.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.type !== undefined) updateData.type = body.type;
    if (body.buyerSellerName !== undefined) updateData.buyerSellerName = body.buyerSellerName;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.value !== undefined) updateData.value = Number(body.value);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.terms !== undefined) updateData.terms = body.terms?.trim() || null;
    return scopedPrisma.contract.update({ where: { id }, data: updateData });
  }

  @Permission('finance.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await scopedPrisma.contract.delete({ where: { id } });
  }
}
