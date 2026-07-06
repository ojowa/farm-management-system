import { Router } from 'express';
import { WorkerController } from './worker.controller';

const router = Router();
const workerController = new WorkerController();

const writeRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'SUPER_ADMIN'];

router.get('/workers', workerController.getAllWorkers);
router.get('/workers/:id', workerController.getWorkerById);
router.post('/workers', workerController.createWorker);
router.put('/workers/:id', workerController.updateWorker);
router.delete('/workers/:id', workerController.deleteWorker);

export const workerRouter = router;
export default router;
