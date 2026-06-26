import { Router } from 'express';
import { WorkerController } from './worker.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const workerController = new WorkerController();

const writeRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];

router.get('/workers', authMiddleware({ permission: 'worker.read' }), workerController.getAllWorkers);
router.get('/workers/:id', authMiddleware({ permission: 'worker.read' }), workerController.getWorkerById);
router.post('/workers', authMiddleware({ roles: writeRoles, permission: 'worker.write' }), workerController.createWorker);
router.put('/workers/:id', authMiddleware({ roles: writeRoles, permission: 'worker.write' }), workerController.updateWorker);
router.delete('/workers/:id', authMiddleware({ roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'], permission: 'worker.delete' }), workerController.deleteWorker);

export const workerRouter = router;
export default router;
