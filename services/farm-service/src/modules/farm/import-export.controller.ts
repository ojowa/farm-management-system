import { Controller, Get, Post, Query, Body, Res, Header, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';

import { scopedPrisma } from '@farm/database';

function getOrgIdFromRequest(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller()
export class ImportExportController {
  @Permission('farm.read')
  @Get('export/farms')
  async exportFarms(@Query('format') format: string, @Res() res: any, req?: any) {
    const farms = await scopedPrisma.farm.findMany({
      where: { organizationId: getOrgIdFromRequest(req) },
    });

    if (format === 'csv') {
      const headers = 'Name,Type,Location,Size,Status\n';
      const rows = farms.map((f: any) => `${f.name},${f.farmType},${f.location || ''},${f.size},${f.status}`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=farms.csv');
      return res.send(headers + rows);
    }
    return res.json(farms);
  }

  @Permission('farm.write')
  @Post('import/farms')
  async importFarms(@Body() body: any, @Res() res: any, req?: any) {
    const { data } = body;
    const orgId = getOrgIdFromRequest(req);
    const created = await scopedPrisma.farm.createMany({
      data: data.map((f: any) => ({
        organizationId: orgId,
        name: f.name,
        farmType: f.farmType || f.farm_type || 'CROP',
        location: f.location || null,
        size: Number(f.size) || 0,
        status: f.status || 'active',
      })),
      skipDuplicates: true,
    });
    return res.status(201).json({ count: created.count, message: `${created.count} farms imported` });
  }

  @Permission('farm.read')
  @Get('export/crops')
  async exportCrops(@Query('format') format: string, @Res() res: any) {
    const crops = await scopedPrisma.crop.findMany();
    if (format === 'csv') {
      const headers = 'Name\n';
      const rows = crops.map((c: any) => c.name).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=crops.csv');
      return res.send(headers + rows);
    }
    return res.json(crops);
  }

  @Permission('farm.read')
  @Get('export/workers')
  async exportWorkers(@Query('format') format: string, @Res() res: any) {
    const workers = await scopedPrisma.worker.findMany();
    if (format === 'csv') {
      const headers = 'Name,Role\n';
      const rows = workers.map((w: any) => `${w.name},${w.role}`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=workers.csv');
      return res.send(headers + rows);
    }
    return res.json(workers);
  }
}
