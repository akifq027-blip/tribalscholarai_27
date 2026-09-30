import express from 'express';
import fellowshipController from '../controllers/fellowshipController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', fellowshipController.getAllFellowships);
router.get('/:id', fellowshipController.getFellowshipById);
router.post('/', authenticateToken, requireRoles('admin', 'super_admin'), fellowshipController.createFellowship);

export default router;
