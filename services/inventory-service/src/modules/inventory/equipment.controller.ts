import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

@Controller('equipment')
export class EquipmentController {
  @Get()
  async findAll(@Query('status') status?: string, @Query('farmId') farmId?: string, @Query('organizationId') orgId?: string) {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (status) where.status = status;
    if (farmId) where.farmId = farmId;
    return scopedPrisma.equipment.findMany({ where, orderBy: { name: 'asc' } });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @Query('organizationId') orgId?: string) {
    const { name, type, model, serialNumber, farmId, purchaseDate, purchaseCost, notes } = body;
    return scopedPrisma.equipment.create({
      data: {
        organizationId: orgId || '', name, type: type || 'OTHER',
        model: model || null, serialNumber: serialNumber || null,
        farmId: farmId || null, purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost || null, notes: notes?.trim() || null,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    for (const key of ['name', 'type', 'model', 'serialNumber', 'status', 'purchaseCost', 'notes']) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (body.purchaseDate !== undefined) updateData.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
    if (body.lastMaintenance !== undefined) updateData.lastMaintenance = body.lastMaintenance ? new Date(body.lastMaintenance) : null;
    if (body.nextMaintenance !== undefined) updateData.nextMaintenance = body.nextMaintenance ? new Date(body.nextMaintenance) : null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    return scopedPrisma.equipment.update({ where: { id }, data: updateData });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await scopedPrisma.equipment.delete({ where: { id } });
  }

  @Get(':id/maintenance')
  async getMaintenance(@Param('id') id: string) {
    return scopedPrisma.maintenanceRecord.findMany({ where: { equipmentId: id }, orderBy: { date: 'desc' } });
  }

  @Post(':id/maintenance')
  @HttpCode(HttpStatus.CREATED)
  async addMaintenance(@Param('id') id: string, @Body() body: any, @Query('organizationId') orgId?: string) {
    const { type, date, cost, description, performedBy } = body;
    const record = await scopedPrisma.maintenanceRecord.create({
      data: {
        organizationId: orgId || '', equipmentId: id,
        type: type || 'SCHEDULED', date: new Date(date),
        cost: cost || null, description, performedBy: performedBy || null,
      },
    });
    await scopedPrisma.equipment.update({ where: { id }, data: { lastMaintenance: new Date(date) } });
    return record;
  }
}
