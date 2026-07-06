import { Router } from 'express';
import { MedicationController } from './medication.controller';

const router = Router();
const medicationController = new MedicationController();

const writeRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'VETERINARIAN', 'SUPER_ADMIN'];
const deleteRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'];

// Medication routes
router.get('/medications', medicationController.getAllMedications);
router.get('/medications/:id', medicationController.getMedicationById);
router.post('/medications', medicationController.createMedication);
router.put('/medications/:id', medicationController.updateMedication);
router.delete('/medications/:id', medicationController.deleteMedication);

export const medicationRouter = router;
export default router;
