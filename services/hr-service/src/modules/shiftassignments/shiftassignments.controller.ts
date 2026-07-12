import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('shift-assignments')
export class ShiftAssignmentsController {
  @Permission('hr.read')
  @Get()
  async findAll(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    const orgId = getOrgId(req);

    const where: any = { organizationId: orgId };
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return scopedPrisma.shiftAssignment.findMany({
      where,
      include: { shift: true },
      orderBy: { date: 'asc' },
    });
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request,
    @Body() body: { shiftId: string; userId: string; date: string; notes?: string },
  ) {
    const orgId = getOrgId(req);
    const { shiftId, userId: assignUserId, date, notes } = body;
    if (!shiftId || !assignUserId || !date) {
      throw new BadRequestException('shiftId, userId, and date are required');
    }

    const shift = await scopedPrisma.shift.findFirst({ where: { id: shiftId, organizationId: orgId } });
    if (!shift) throw new NotFoundException('Shift not found');

    const existing = await scopedPrisma.shiftAssignment.findFirst({
      where: { shiftId, userId: assignUserId, date: new Date(date) },
    });
    if (existing) throw new ConflictException('User already assigned to this shift on this date');

    return scopedPrisma.shiftAssignment.create({
      data: {
        organizationId: orgId,
        shiftId,
        userId: assignUserId,
        date: new Date(date),
        notes: notes || null,
      },
      include: { shift: true },
    });
  }

  @Permission('hr.write')
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(
    @Req() req: Request,
    @Body() body: { assignments: { shiftId: string; userId: string; date: string; notes?: string }[] },
  ) {
    const orgId = getOrgId(req);
    const { assignments } = body;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new BadRequestException('assignments array is required');
    }

    const created = await scopedPrisma.shiftAssignment.createMany({
      data: assignments.map((a) => ({
        organizationId: orgId,
        shiftId: a.shiftId,
        userId: a.userId,
        date: new Date(a.date),
        notes: a.notes || null,
      })),
      skipDuplicates: true,
    });

    return { count: created.count };
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const existing = await scopedPrisma.shiftAssignment.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await scopedPrisma.shiftAssignment.delete({ where: { id } });
  }
}
