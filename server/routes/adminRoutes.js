import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticateToken, requireRoles('admin', 'super_admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/students', adminController.getAllStudents);
router.put('/students/:id/status', adminController.toggleUserStatus);
router.get('/applications', adminController.getAllApplicationsAdmin);
router.get('/analytics', adminController.getAnalytics);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
