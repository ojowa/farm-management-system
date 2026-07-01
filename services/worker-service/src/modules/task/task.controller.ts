import { Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

export class TaskController {
  async createTask(req: Request, res: Response) {
    try {
      const orgId = String(req.headers['x-organization-id'] || '');
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });

      const createdBy = (req as any).user;
      const task = await scopedPrisma.task.create({
        data: {
          organizationId: orgId,
          title,
          description: description || null,
          priority: priority || 'MEDIUM',
          status: status || 'PENDING',
          assignedToId: assignedToId || null,
          assignedToName: assignedToName || null,
          createdById: createdBy?.sub || null,
          createdByName: createdBy?.email || null,
          farmId: farmId || null,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getTasks(req: Request, res: Response) {
    try {
      const orgId = String(req.headers['x-organization-id'] || '');
      const user = (req as any).user;
      const { status, assignedToId } = req.query;

      const where: any = { organizationId: orgId };
      if (status) where.status = String(status);

      // Workers only see their own tasks
      if (user?.role === 'WORKER') {
        where.assignedToId = user.sub;
      } else if (assignedToId) {
        where.assignedToId = String(assignedToId);
      }

      const tasks = await scopedPrisma.task.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      });
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTaskById(req: Request, res: Response) {
    try {
      const taskId = String(req.params.id);
      const task = await scopedPrisma.task.findUnique({ where: { id: taskId } });
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateTask(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const taskId = String(req.params.id);
      const existing = await scopedPrisma.task.findUnique({ where: { id: taskId } });
      if (!existing) return res.status(404).json({ error: 'Task not found' });

      // Workers can only update status of their own tasks
      if (user?.role === 'WORKER') {
        if (existing.assignedToId !== user.sub) {
          return res.status(403).json({ error: 'Cannot update tasks not assigned to you' });
        }
        // Workers can only change status
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status is required' });
        const updated = await scopedPrisma.task.update({
          where: { id: taskId },
          data: {
            status,
            ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
          },
        });
        return res.json(updated);
      }

      // Supervisors+ can update anything
      const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate } = req.body;
      const updated = await scopedPrisma.task.update({
        where: { id: taskId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(priority !== undefined && { priority }),
          ...(status !== undefined && {
            status,
            ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
          }),
          ...(assignedToId !== undefined && { assignedToId }),
          ...(assignedToName !== undefined && { assignedToName }),
          ...(farmId !== undefined && { farmId }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        },
      });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteTask(req: Request, res: Response) {
    try {
      const taskId = String(req.params.id);
      const existing = await scopedPrisma.task.findUnique({ where: { id: taskId } });
      if (!existing) return res.status(404).json({ error: 'Task not found' });
      await scopedPrisma.task.delete({ where: { id: taskId } });
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
}
