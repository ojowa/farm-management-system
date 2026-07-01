import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { scopedPrisma } from '@farm/database';
import { createNotification } from '../lib/notificationClient';

const router = Router();

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

function getUserId(req: Request): string {
  return String((req as any).user?.sub || '');
}

function getUserRole(req: Request): string {
  return String((req as any).user?.role || '');
}

function canApprove(role: string): boolean {
  return ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'].includes(role);
}

// GET /leave/requests - List leave requests
router.get('/', authMiddleware({ permission: 'leave.read' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const role = getUserRole(req);
    const { status, userId: filterUserId } = req.query;

    const where: any = { organizationId: orgId };
    if (status) where.status = String(status);

    // Workers only see their own requests
    if (role === 'WORKER') {
      where.userId = userId;
    } else if (filterUserId) {
      where.userId = String(filterUserId);
    }

    const requests = await scopedPrisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: { select: { name: true, isPaid: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /leave/requests - Submit leave request
router.post('/', authMiddleware({ permission: 'leave.write' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const { leaveTypeId, startDate, endDate, reason } = req.body;

    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: 'leaveTypeId, startDate, and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return res.status(400).json({ error: 'endDate must be after startDate' });

    // Calculate business days (skip weekends)
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) days++;
      current.setDate(current.getDate() + 1);
    }
    if (days === 0) return res.status(400).json({ error: 'Leave must include at least one business day' });

    // Check balance
    const year = start.getFullYear();
    const balance = await scopedPrisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    });
    if (balance && (balance.usedDays + days) > balance.totalDays) {
      return res.status(400).json({ error: `Insufficient leave balance. Available: ${balance.totalDays - balance.usedDays} days` });
    }

    const request = await scopedPrisma.leaveRequest.create({
      data: {
        organizationId: orgId,
        userId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason: reason || null,
      },
      include: { leaveType: { select: { name: true } } },
    });
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /leave/requests/:id/approve - Approve leave
router.put('/:id/approve', authMiddleware({ permission: 'leave.approve' }), async (req: Request, res: Response) => {
  try {
    const role = getUserRole(req);
    if (!canApprove(role)) return res.status(403).json({ error: 'Not authorized to approve leave' });

    const id = String(req.params.id);
    const existing = await scopedPrisma.leaveRequest.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Leave request not found' });
    if (existing.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });

    const approverId = getUserId(req);

    // Update request status
    const updated = await scopedPrisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: { leaveType: { select: { name: true } } },
    });

    // Update balance
    const year = new Date(existing.startDate).getFullYear();
    await scopedPrisma.leaveBalance.upsert({
      where: { userId_leaveTypeId_year: { userId: existing.userId, leaveTypeId: existing.leaveTypeId, year } },
      create: {
        organizationId: existing.organizationId,
        userId: existing.userId,
        leaveTypeId: existing.leaveTypeId,
        year,
        totalDays: 0,
        usedDays: existing.days,
      },
      update: { usedDays: { increment: existing.days } },
    });

    // Create notification for the employee via notification-service
    try {
      const leaveType = await scopedPrisma.leaveType.findFirst({ where: { id: existing.leaveTypeId } });
      await createNotification({
        userId: existing.userId,
        title: 'Leave Approved',
        message: `Your ${leaveType?.name || 'leave'} request for ${existing.days} day(s) has been approved.`,
        type: 'SUCCESS',
        link: '/hr/leave',
        entityType: 'LeaveRequest',
        entityId: id,
      });
    } catch { /* notification creation is best-effort */ }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /leave/requests/:id/reject - Reject leave
router.put('/:id/reject', authMiddleware({ permission: 'leave.approve' }), async (req: Request, res: Response) => {
  try {
    const role = getUserRole(req);
    if (!canApprove(role)) return res.status(403).json({ error: 'Not authorized to reject leave' });

    const id = String(req.params.id);
    const existing = await scopedPrisma.leaveRequest.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Leave request not found' });
    if (existing.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });

    const { rejectionReason } = req.body;
    const updated = await scopedPrisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: getUserId(req),
        approvedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
      include: { leaveType: { select: { name: true } } },
    });

    // Create notification for the employee via notification-service
    try {
      const leaveType = await scopedPrisma.leaveType.findFirst({ where: { id: existing.leaveTypeId } });
      await createNotification({
        userId: existing.userId,
        title: 'Leave Rejected',
        message: `Your ${leaveType?.name || 'leave'} request for ${existing.days} day(s) has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: 'ALERT',
        link: '/hr/leave',
        entityType: 'LeaveRequest',
        entityId: id,
      });
    } catch { /* notification creation is best-effort */ }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /leave/requests/:id/cancel - Cancel own request
router.put('/:id/cancel', authMiddleware({ permission: 'leave.write' }), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    const existing = await scopedPrisma.leaveRequest.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Leave request not found' });
    if (existing.userId !== userId) return res.status(403).json({ error: 'Cannot cancel requests from other users' });
    if (existing.status !== 'PENDING') return res.status(400).json({ error: 'Only pending requests can be cancelled' });

    const updated = await scopedPrisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const leaveRequestsRouter = router;
