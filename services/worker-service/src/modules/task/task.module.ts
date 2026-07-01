import { Router } from 'express';
import { TaskController } from './task.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const taskController = new TaskController();

const canCreateTasks = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];

router.get('/tasks', authMiddleware({ permission: 'task.read' }), taskController.getTasks);
router.get('/tasks/:id', authMiddleware({ permission: 'task.read' }), taskController.getTaskById);
router.post('/tasks', authMiddleware({ roles: canCreateTasks, permission: 'task.write' }), taskController.createTask);
router.put('/tasks/:id', authMiddleware({ permission: 'task.write' }), taskController.updateTask);
router.delete('/tasks/:id', authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'], permission: 'task.delete' }), taskController.deleteTask);

export const taskRouter = router;
export default router;
