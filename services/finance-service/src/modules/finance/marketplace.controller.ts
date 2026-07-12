import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('marketplace')
export class MarketplaceController {
  @Permission('finance.read')
  @Get('buyers')
  async findBuyers(@Query('organizationId') orgId?: string) {
    return scopedPrisma.buyer.findMany({ where: { organizationId: orgId || '' }, orderBy: { name: 'asc' } });
  }

  @Permission('finance.write')
  @Post('buyers')
  @HttpCode(HttpStatus.CREATED)
  async createBuyer(@Body() body: any, @Query('organizationId') orgId?: string) {
    const { name, contactPerson, email, phone, address, type, notes } = body;
    return scopedPrisma.buyer.create({
      data: {
        organizationId: orgId || '', name,
        contactPerson: contactPerson || null, email: email || null,
        phone: phone || null, address: address || null,
        type: type || 'INDIVIDUAL', notes: notes?.trim() || null,
      },
    });
  }

  @Permission('finance.write')
  @Put('buyers/:id')
  async updateBuyer(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    for (const key of ['name', 'contactPerson', 'email', 'phone', 'address', 'type']) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    return scopedPrisma.buyer.update({ where: { id }, data: updateData });
  }

  @Permission('finance.delete')
  @Delete('buyers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBuyer(@Param('id') id: string) {
    await scopedPrisma.buyer.delete({ where: { id } });
  }

  @Permission('finance.read')
  @Get('listings')
  async findListings(@Query('status') status?: string, @Query('entityType') entityType?: string, @Query('organizationId') orgId?: string) {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;
    return scopedPrisma.marketListing.findMany({ where, include: { buyer: true }, orderBy: { listedDate: 'desc' } });
  }

  @Permission('finance.write')
  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  async createListing(@Body() body: any, @Query('organizationId') orgId?: string) {
    const { buyerId, entityType, entityId, title, price, unit, quantity } = body;
    return scopedPrisma.marketListing.create({
      data: {
        organizationId: orgId || '',
        buyerId: buyerId || null, entityType: entityType || null,
        entityId: entityId || null, title,
        price: Number(price), unit: unit || 'kg',
        quantity: Number(quantity), listedDate: new Date(),
      },
    });
  }

  @Permission('finance.write')
  @Put('listings/:id')
  async updateListing(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.soldDate !== undefined) updateData.soldDate = body.soldDate ? new Date(body.soldDate) : null;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.quantity !== undefined) updateData.quantity = Number(body.quantity);
    return scopedPrisma.marketListing.update({ where: { id }, data: updateData });
  }

  @Permission('finance.delete')
  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteListing(@Param('id') id: string) {
    await scopedPrisma.marketListing.delete({ where: { id } });
  }
}
