import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();

const CAN_CREATE_ROLES = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

function getUserRole(req: Request): string {
  return String((req as any).user?.role || '');
}

// GET /tasks - List tasks for this org
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const user = (req as any).user;
    const { status, priority, assignedToId, farmId, search } = req.query;

    const where: any = { organizationId: orgId };
    if (status) where.status = String(status);
    if (priority) where.priority = String(priority);
    if (farmId) where.farmId = String(farmId);
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    // Workers only see their own tasks
    if (getUserRole(req) === 'WORKER') {
      where.assignedToId = user?.sub;
    } else if (assignedToId) {
      where.assignedToId = String(assignedToId);
    }

    const tasks = await scopedPrisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    const stats = await scopedPrisma.task.groupBy({
      by: ['status'],
      where: { organizationId: orgId },
      _count: true,
    });

    res.json({ data: tasks, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /tasks/:id - Get single task
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await scopedPrisma.task.findUnique({ where: { id: String(req.params.id) } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /tasks - Create task
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const user = (req as any).user;
    const role = getUserRole(req);

    if (!CAN_CREATE_ROLES.includes(role)) {
      return res.status(403).json({ error: 'You do not have permission to create tasks' });
    }

    const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const task = await scopedPrisma.task.create({
      data: {
        organizationId: orgId,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        assignedToId: assignedToId || null,
        assignedToName: assignedToName || null,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
        farmId: farmId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /tasks/:id - Update task
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = (req as any).user;
    const role = getUserRole(req);
    const existing = await scopedPrisma.task.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    // Workers can only update status of their own tasks
    if (role === 'WORKER') {
      if (existing.assignedToId !== user?.sub) {
        return res.status(403).json({ error: 'Cannot update tasks not assigned to you' });
      }
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: 'Status is required' });
      const updated = await scopedPrisma.task.update({
        where: { id },
        data: {
          status,
          ...(status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
        },
      });
      return res.json(updated);
    }

    // Supervisors+ can update anything
    const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') updateData.completedAt = new Date();
      else updateData.completedAt = null;
    }
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (assignedToName !== undefined) updateData.assignedToName = assignedToName || null;
    if (farmId !== undefined) updateData.farmId = farmId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await scopedPrisma.task.update({ where: { id }, data: updateData });
    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /tasks/:id - Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.task.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    await scopedPrisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /tasks/:id/status - Quick status update
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const task = await scopedPrisma.task.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
      },
    });
    res.json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const tasksRouter = router;
