import express from 'express';
import documentController, { upload } from '../controllers/documentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/upload', authenticateToken, upload.single('document'), documentController.uploadDocument);
router.put('/:id/verify', authenticateToken, requireRoles('institute', 'admin', 'super_admin'), documentController.verifyDocument);
router.get('/:id/ocr-extract', authenticateToken, requireRoles('institute', 'admin', 'super_admin'), documentController.ocrExtractDocument);

export default router;
