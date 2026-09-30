import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const data = await notificationService.getUserNotifications(req.user.id);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', authenticateToken, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});

export default router;
