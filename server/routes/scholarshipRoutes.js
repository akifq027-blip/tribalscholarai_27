import express from 'express';
import scholarshipController from '../controllers/scholarshipController.js';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', optionalAuth, scholarshipController.getAllScholarships);
router.get('/:id', optionalAuth, scholarshipController.getScholarshipById);
router.post('/:id/eligibility', optionalAuth, scholarshipController.checkScholarshipEligibility);

// Admin routes
router.post('/', authenticateToken, requireRoles('admin', 'super_admin'), scholarshipController.createScholarship);
router.put('/:id', authenticateToken, requireRoles('admin', 'super_admin'), scholarshipController.updateScholarship);
router.delete('/:id', authenticateToken, requireRoles('admin', 'super_admin'), scholarshipController.deleteScholarship);

export default router;
