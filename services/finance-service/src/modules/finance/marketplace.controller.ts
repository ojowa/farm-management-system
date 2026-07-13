import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('marketplace')
export class MarketplaceController {
  @Permission('finance.read')
  @Get('buyers')
  async findBuyers(@Req() req: any) {
    return scopedPrisma.buyer.findMany({ where: { organizationId: getOrgId(req) }, orderBy: { name: 'asc' } });
  }

  @Permission('finance.write')
  @Post('buyers')
  @HttpCode(HttpStatus.CREATED)
  async createBuyer(@Req() req: any, @Body() body: any) {
    const { name, contactPerson, email, phone, address, type, notes } = body;
    return scopedPrisma.buyer.create({
      data: {
        organizationId: getOrgId(req), name,
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
  async findListings(@Req() req: any, @Query('status') status?: string, @Query('entityType') entityType?: string) {
    const where: any = { organizationId: getOrgId(req) };
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;
    return scopedPrisma.marketListing.findMany({ where, include: { buyer: true }, orderBy: { listedDate: 'desc' } });
  }

  @Permission('finance.write')
  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  async createListing(@Req() req: any, @Body() body: any) {
    const { buyerId, entityType, entityId, title, price, unit, quantity } = body;
    return scopedPrisma.marketListing.create({
      data: {
        organizationId: getOrgId(req),
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
