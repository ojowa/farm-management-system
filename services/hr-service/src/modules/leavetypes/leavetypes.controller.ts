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

@Controller('leave/types')
export class LeaveTypesController {
  @Get()
  async findAll(@Req() req: Request) {
    const orgId = getOrgId(req);
    return scopedPrisma.leaveType.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { leaveRequests: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() body: { name: string; daysPerYear?: number; isPaid?: boolean }) {
    const orgId = getOrgId(req);
    const { name, daysPerYear, isPaid } = body;
    if (!name) throw new BadRequestException('Name is required');

    const existing = await scopedPrisma.leaveType.findFirst({ where: { name: name.trim(), organizationId: orgId } });
    if (existing) throw new ConflictException('Leave type already exists');

    return scopedPrisma.leaveType.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        daysPerYear: daysPerYear ?? 0,
        isPaid: isPaid ?? true,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; daysPerYear?: number; isPaid?: boolean; isActive?: boolean }) {
    const existing = await scopedPrisma.leaveType.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Leave type not found');

    const { name, daysPerYear, isPaid, isActive } = body;
    return scopedPrisma.leaveType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(daysPerYear !== undefined && { daysPerYear }),
        ...(isPaid !== undefined && { isPaid }),
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const existing = await scopedPrisma.leaveType.findFirst({
      where: { id },
      include: { _count: { select: { leaveRequests: true } } },
    });
    if (!existing) throw new NotFoundException('Leave type not found');
    if ((existing as any)._count.leaveRequests > 0) {
      throw new ConflictException('Cannot delete leave type with existing requests');
    }
    await scopedPrisma.leaveType.delete({ where: { id } });
  }
}
