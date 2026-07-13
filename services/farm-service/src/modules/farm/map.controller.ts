import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

function getOrgIdFromRequest(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('map')
export class MapController {
  @Permission('farm.read')
  @Get('all')
  async getAllFarmLocations(req?: any) {
    return scopedPrisma.farm.findMany({
      where: { organizationId: getOrgIdFromRequest(req) },
      select: { id: true, name: true, farmType: true, latitude: true, longitude: true, location: true, status: true },
    });
  }

  @Permission('farm.write')
  @Put(':id/location')
  async updateFarmLocation(@Param('id') id: string, @Body() body: any) {
    const { latitude, longitude } = body;
    return scopedPrisma.farm.update({
      where: { id },
      data: {
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      },
    });
  }
}
