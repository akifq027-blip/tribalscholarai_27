import express from 'express';
import instituteController from '../controllers/instituteController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticateToken, requireRoles('institute', 'admin', 'super_admin'));

router.get('/applications', instituteController.getAssignedApplications);
router.post('/verify', instituteController.verifyInstituteApplication);

export default router;
