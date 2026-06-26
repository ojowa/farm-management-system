import { Router } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { ReportingController } from './reporting.controller';

const router = Router();
const controller = new ReportingController();

// CRUD for reporting artifacts
// List
router.get(
  '/reports',
  authMiddleware({ permission: 'reporting.read' }),
  controller.getAllReports,
);

// Detail
router.get(
  '/reports/:id',
  authMiddleware({ permission: 'reporting.read' }),
  controller.getReportById,
);

// Create
router.post(
  '/reports',
  authMiddleware({
    roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'],
    permission: 'reporting.write',
  }),
  controller.createReport,
);

// Update
router.put(
  '/reports/:id',
  authMiddleware({
    roles: ['ORGANIZATION_OWNER', 'FARM_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'],
    permission: 'reporting.write',
  }),
  controller.updateReport,
);

// Delete
router.delete(
  '/reports/:id',
  authMiddleware({
    roles: ['ORGANIZATION_OWNER', 'ACCOUNTANT', 'SUPER_ADMIN'],
    permission: 'reporting.delete',
  }),
  controller.deleteReport,
);

export default router;

