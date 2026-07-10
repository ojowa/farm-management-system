import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Request } from 'express';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

@Controller('shifts')
export class ShiftsController {
  @Get()
  async findAll(@Req() req: Request) {
    const orgId = getOrgId(req);
    return scopedPrisma.shift.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { assignments: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request,
    @Body() body: { name: string; startTime: string; endTime: string; color?: string },
  ) {
    const orgId = getOrgId(req);
    const { name, startTime, endTime, color } = body;
    if (!name || !startTime || !endTime) {
      throw new BadRequestException('Name, startTime, and endTime are required');
    }

    const existing = await scopedPrisma.shift.findFirst({ where: { name: name.trim(), organizationId: orgId } });
    if (existing) throw new ConflictException('Shift already exists');

    return scopedPrisma.shift.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        startTime,
        endTime,
        color: color || '#3B82F6',
      },
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; startTime?: string; endTime?: string; color?: string; isActive?: boolean },
  ) {
    const existing = await scopedPrisma.shift.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');

    const { name, startTime, endTime, color, isActive } = body;
    return scopedPrisma.shift.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const existing = await scopedPrisma.shift.findFirst({
      where: { id },
      include: { _count: { select: { assignments: true } } },
    });
    if (!existing) throw new NotFoundException('Shift not found');
    if ((existing as any)._count.assignments > 0) {
      throw new ConflictException('Cannot delete shift with existing assignments');
    }
    await scopedPrisma.shift.delete({ where: { id } });
  }
}
