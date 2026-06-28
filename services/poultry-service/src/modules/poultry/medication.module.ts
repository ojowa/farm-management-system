import { Router } from 'express';
import { MedicationController } from './medication.controller';
import { authMiddleware } from '@farm/auth/express';

const router = Router();
const medicationController = new MedicationController();

const writeRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPERVISOR', 'VETERINARIAN', 'SUPER_ADMIN'];
const deleteRoles = ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'SUPER_ADMIN'];

// Medication routes
router.get('/medications', authMiddleware({ permission: 'poultry.read' }), medicationController.getAllMedications);
router.get('/medications/:id', authMiddleware({ permission: 'poultry.read' }), medicationController.getMedicationById);
router.post('/medications', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), medicationController.createMedication);
router.put('/medications/:id', authMiddleware({ roles: writeRoles, permission: 'poultry.write' }), medicationController.updateMedication);
router.delete('/medications/:id', authMiddleware({ roles: deleteRoles, permission: 'poultry.delete' }), medicationController.deleteMedication);

export const medicationRouter = router;
export default router;
