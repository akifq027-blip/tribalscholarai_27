import express from 'express';
import applicationController from '../controllers/applicationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/', authenticateToken, applicationController.submitApplication);
router.get('/my', authenticateToken, applicationController.getMyApplications);
router.get('/:id', authenticateToken, applicationController.getApplicationDetails);
router.put('/:id/status', authenticateToken, requireRoles('institute', 'admin', 'super_admin'), applicationController.updateApplicationStatus);

export default router;
