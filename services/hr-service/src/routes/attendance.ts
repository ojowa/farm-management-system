import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

interface AttendanceRecord {
  id: string;
  organizationId: string;
  workerId: string;
  workerName: string;
  date: Date;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  notes: string | null;
}

// GET /attendance - List attendance records
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { workerId, date, startDate, endDate, status } = req.query;

    const where: any = { organizationId: orgId };
    if (workerId) where.workerId = String(workerId);
    if (status) where.status = String(status);
    if (date) {
      const d = new Date(String(date));
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }

    const records: AttendanceRecord[] = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { workerName: 'asc' }],
    });

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/today - Today's attendance summary
router.get('/today', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const records: AttendanceRecord[] = await prisma.attendance.findMany({
      where: { organizationId: orgId, date: { gte: start, lte: end } },
    });

    const summary = {
      total: records.length,
      present: records.filter((r: AttendanceRecord) => r.status === 'PRESENT').length,
      absent: records.filter((r: AttendanceRecord) => r.status === 'ABSENT').length,
      late: records.filter((r: AttendanceRecord) => r.status === 'LATE').length,
      halfDay: records.filter((r: AttendanceRecord) => r.status === 'HALF_DAY').length,
      onLeave: records.filter((r: AttendanceRecord) => r.status === 'ON_LEAVE').length,
    };

    res.json({ records, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/summary - Monthly summary for a worker
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { workerId, month, year } = req.query;

    if (!workerId) return res.status(400).json({ error: 'workerId is required' });

    const m = month ? parseInt(String(month)) : new Date().getMonth();
    const y = year ? parseInt(String(year)) : new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const records: AttendanceRecord[] = await prisma.attendance.findMany({
      where: {
        organizationId: orgId,
        workerId: String(workerId),
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    const summary = {
      totalDays: records.length,
      present: records.filter((r: AttendanceRecord) => r.status === 'PRESENT').length,
      absent: records.filter((r: AttendanceRecord) => r.status === 'ABSENT').length,
      late: records.filter((r: AttendanceRecord) => r.status === 'LATE').length,
      halfDay: records.filter((r: AttendanceRecord) => r.status === 'HALF_DAY').length,
      onLeave: records.filter((r: AttendanceRecord) => r.status === 'ON_LEAVE').length,
      totalHours: records.reduce((sum: number, r: AttendanceRecord) => sum + (r.hoursWorked || 0), 0),
      attendanceRate: records.length > 0
        ? Math.round(((records.filter((r: AttendanceRecord) => r.status === 'PRESENT' || r.status === 'LATE').length) / records.length) * 100)
        : 0,
    };

    res.json({ records, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /attendance - Create attendance record
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { workerId, workerName, date, status, clockIn, clockOut, hoursWorked, notes } = req.body;

    if (!workerId || !workerName || !date || !status) {
      return res.status(400).json({ error: 'workerId, workerName, date, and status are required' });
    }

    const record = await prisma.attendance.create({
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

    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /attendance/clock-in - Clock in a worker
router.post('/clock-in', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { workerId, workerName } = req.body;

    if (!workerId || !workerName) {
      return res.status(400).json({ error: 'workerId and workerName are required' });
    }

    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const existing = await prisma.attendance.findFirst({
      where: { organizationId: orgId, workerId, date: { gte: start, lte: end } },
    });

    if (existing) {
      return res.status(409).json({ error: 'Worker already clocked in today' });
    }

    const clockInTime = today.toTimeString().slice(0, 5);
    const isLate = clockInTime > '09:00';

    const record = await prisma.attendance.create({
      data: {
        organizationId: orgId,
        workerId,
        workerName,
        date: today,
        status: isLate ? 'LATE' : 'PRESENT',
        clockIn: clockInTime,
      },
    });

    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /attendance/clock-out - Clock out a worker
router.post('/clock-out', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { workerId } = req.body;

    if (!workerId) return res.status(400).json({ error: 'workerId is required' });

    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const existing = await prisma.attendance.findFirst({
      where: { organizationId: orgId, workerId, date: { gte: start, lte: end } },
    });

    if (!existing) return res.status(404).json({ error: 'No clock-in record found for today' });
    if (existing.clockOut) return res.status(409).json({ error: 'Worker already clocked out today' });

    const clockOutTime = today.toTimeString().slice(0, 5);
    const hoursWorked = existing.clockIn
      ? Math.round(((parseInt(clockOutTime.slice(0, 2)) * 60 + parseInt(clockOutTime.slice(3))) -
          (parseInt(existing.clockIn.slice(0, 2)) * 60 + parseInt(existing.clockIn.slice(3)))) / 60 * 100) / 100
      : null;

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: { clockOut: clockOutTime, hoursWorked },
    });

    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /attendance/:id - Update attendance record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Attendance record not found' });

    const { status, clockIn, clockOut, hoursWorked, notes } = req.body;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (clockIn !== undefined) updateData.clockIn = clockIn;
    if (clockOut !== undefined) updateData.clockOut = clockOut;
    if (hoursWorked !== undefined) updateData.hoursWorked = hoursWorked;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const record = await prisma.attendance.update({ where: { id }, data: updateData });
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /attendance/bulk - Bulk create attendance records
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required' });
    }

    const created = await prisma.attendance.createMany({
      data: records.map((r: any) => ({
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

    res.status(201).json({ count: created.count });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const attendanceRouter = router;
