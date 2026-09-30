import express from 'express';
import studentController from '../controllers/studentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/profile', authenticateToken, studentController.getProfile);
router.put('/profile', authenticateToken, studentController.updateProfile);
router.get('/dashboard', authenticateToken, requireRoles('student', 'admin', 'super_admin'), studentController.getDashboard);

export default router;
