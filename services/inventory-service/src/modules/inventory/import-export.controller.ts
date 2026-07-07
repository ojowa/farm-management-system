import { Controller, Get, Post, Query, Body, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { scopedPrisma } from '@farm/database';

@Controller()
export class ImportExportController {
  @Get('export')
  async exportInventory(@Query('format') format: string, @Res() res: Response) {
    const items = await scopedPrisma.inventory.findMany();
    if (format === 'csv') {
      const headers = 'Name,Category,Quantity,Unit\n';
      const rows = items.map((i: any) => `${i.name},${i.category},${i.quantity},${i.unit}`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
      return res.send(headers + rows);
    }
    return res.json(items);
  }

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async importInventory(@Body() body: any) {
    const { data } = body;
    const created = await scopedPrisma.inventory.createMany({
      data: data.map((item: any) => ({
        farmId: item.farmId || null,
        name: item.name,
        category: item.category || 'Other',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || 'units',
      })),
      skipDuplicates: true,
    });
    return { count: created.count, message: `${created.count} items imported` };
  }
}
