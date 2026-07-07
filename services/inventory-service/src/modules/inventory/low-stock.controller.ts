import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

@Controller('low-stock')
export class LowStockController {
  @Get()
  async findLowStock(@Query('organizationId') orgId?: string) {
    return scopedPrisma.$queryRaw`
      SELECT * FROM "Inventory"
      WHERE "minimumQuantity" > 0
        AND "quantity" <= "minimumQuantity"
        AND "farmId" IN (
          SELECT id FROM "Farm" WHERE "organizationId" = ${orgId || ''}
        )
      ORDER BY ("quantity" / NULLIF("minimumQuantity", 0)) ASC
    `;
  }

  @Post(':id/reorder')
  async reorder(@Param('id') id: string) {
    const item = await scopedPrisma.inventory.findUnique({ where: { id } });
    if (!item) return { error: 'Item not found' };
    return { message: `Reorder notification triggered for ${item.name}`, item };
  }
}
