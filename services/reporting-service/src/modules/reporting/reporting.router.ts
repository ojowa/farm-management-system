import { Router } from 'express';
import { ReportingController } from './reporting.controller';

const router = Router();
const controller = new ReportingController();

// CRUD for reporting artifacts
// List
router.get('/reports', controller.getAllReports);

// Detail
router.get('/reports/:id', controller.getReportById);

// Create
router.post('/reports', controller.createReport);

// Update
router.put('/reports/:id', controller.updateReport);

// Delete
router.delete('/reports/:id', controller.deleteReport);

export default router;

