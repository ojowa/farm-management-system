import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { scopedPrisma } from '@farm/database';

const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

@Controller('attendance')
export class AttendanceController {
  @Get()
  async findAll(
    @Req() req: Request,
    @Query('workerId') workerId?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    const orgId = getOrgId(req);

    const where: any = { organizationId: orgId };
    if (workerId) where.workerId = workerId;
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { workerName: 'asc' }],
    });
  }

  @Get('today')
  async today(@Req() req: Request) {
    const orgId = getOrgId(req);
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const records = await prisma.attendance.findMany({
      where: { organizationId: orgId, date: { gte: start, lte: end } },
    });

    const summary = {
      total: records.length,
      present: records.filter((r: any) => r.status === 'PRESENT').length,
      absent: records.filter((r: any) => r.status === 'ABSENT').length,
      late: records.filter((r: any) => r.status === 'LATE').length,
      halfDay: records.filter((r: any) => r.status === 'HALF_DAY').length,
      onLeave: records.filter((r: any) => r.status === 'ON_LEAVE').length,
    };

    return { records, summary };
  }

  @Get('summary')
  async summary(
    @Req() req: Request,
    @Query('workerId') workerId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const orgId = getOrgId(req);

    if (!workerId) throw new Error('workerId is required');

    const m = month ? parseInt(month) : new Date().getMonth();
    const y = year ? parseInt(year) : new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const records = await prisma.attendance.findMany({
      where: {
        organizationId: orgId,
        workerId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    const summaryData = {
      totalDays: records.length,
      present: records.filter((r: any) => r.status === 'PRESENT').length,
      absent: records.filter((r: any) => r.status === 'ABSENT').length,
      late: records.filter((r: any) => r.status === 'LATE').length,
      halfDay: records.filter((r: any) => r.status === 'HALF_DAY').length,
      onLeave: records.filter((r: any) => r.status === 'ON_LEAVE').length,
      totalHours: records.reduce((sum: number, r: any) => sum + (r.hoursWorked || 0), 0),
      attendanceRate: records.length > 0
        ? Math.round(((records.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length) / records.length) * 100)
        : 0,
    };

    return { records, summary: summaryData };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request,
    @Body() body: {
      workerId: string;
      workerName: string;
      date: string;
      status: string;
      clockIn?: string;
      clockOut?: string;
      hoursWorked?: number;
      notes?: string;
    },
  ) {
    const orgId = getOrgId(req);
    const { workerId, workerName, date, status, clockIn, clockOut, hoursWorked, notes } = body;

    if (!workerId || !workerName || !date || !status) {
      throw new Error('workerId, workerName, date, and status are required');
    }

    return prisma.attendance.create({
      data: {
        organizationId: orgId,
        workerId,
        workerName,
        date: new Date(date),
        status,
        clockIn: clockIn || null,
        clockOut: clockOut || null,
        hoursWorked: hoursWorked || null,
        notes: notes?.trim() || null,
      },
    });
  }

  @Post('clock-in')
  @HttpCode(HttpStatus.CREATED)
  async clockIn(
    @Req() req: Request,
    @Body() body: { workerId: string; workerName: string },
  ) {
    const orgId = getOrgId(req);
    const { workerId, workerName } = body;

    if (!workerId || !workerName) {
      throw new Error('workerId and workerName are required');
    }

    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const existing = await prisma.attendance.findFirst({
      where: { organizationId: orgId, workerId, date: { gte: start, lte: end } },
    });

    if (existing) {
      throw new Error('Worker already clocked in today');
    }

    const clockInTime = today.toTimeString().slice(0, 5);
    const isLate = clockInTime > '09:00';

    return prisma.attendance.create({
      data: {
        organizationId: orgId,
        workerId,
        workerName,
        date: today,
        status: isLate ? 'LATE' : 'PRESENT',
        clockIn: clockInTime,
      },
    });
  }

  @Post('clock-out')
  async clockOut(
    @Req() req: Request,
    @Body() body: { workerId: string },
  ) {
    const orgId = getOrgId(req);
    const { workerId } = body;

    if (!workerId) throw new Error('workerId is required');

    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const existing = await prisma.attendance.findFirst({
      where: { organizationId: orgId, workerId, date: { gte: start, lte: end } },
    });

    if (!existing) throw new Error('No clock-in record found for today');
    if (existing.clockOut) throw new Error('Worker already clocked out today');

    const clockOutTime = today.toTimeString().slice(0, 5);
    const hoursWorked = existing.clockIn
      ? Math.round(((parseInt(clockOutTime.slice(0, 2)) * 60 + parseInt(clockOutTime.slice(3))) -
          (parseInt(existing.clockIn.slice(0, 2)) * 60 + parseInt(existing.clockIn.slice(3)))) / 60 * 100) / 100
      : null;

    return prisma.attendance.update({
      where: { id: existing.id },
      data: { clockOut: clockOutTime, hoursWorked },
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { status?: string; clockIn?: string; clockOut?: string; hoursWorked?: number; notes?: string },
  ) {
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) throw new Error('Attendance record not found');

    const { status, clockIn, clockOut, hoursWorked, notes } = body;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (clockIn !== undefined) updateData.clockIn = clockIn;
    if (clockOut !== undefined) updateData.clockOut = clockOut;
    if (hoursWorked !== undefined) updateData.hoursWorked = hoursWorked;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    return prisma.attendance.update({ where: { id }, data: updateData });
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(
    @Req() req: Request,
    @Body() body: {
      records: {
        workerId: string;
        workerName: string;
        date: string;
        status: string;
        clockIn?: string;
        clockOut?: string;
        hoursWorked?: number;
        notes?: string;
      }[];
    },
  ) {
    const orgId = getOrgId(req);
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('records array is required');
    }

    const created = await prisma.attendance.createMany({
      data: records.map((r) => ({
        organizationId: orgId,
        workerId: r.workerId,
        workerName: r.workerName,
        date: new Date(r.date),
        status: r.status,
        clockIn: r.clockIn || null,
        clockOut: r.clockOut || null,
        hoursWorked: r.hoursWorked || null,
        notes: r.notes?.trim() || null,
      })),
      skipDuplicates: true,
    });

    return { count: created.count };
  }
}
