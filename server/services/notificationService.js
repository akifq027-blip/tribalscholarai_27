import db from '../config/database.js';

export async function createNotification(userId, title, message, type = 'info') {
  try {
    const result = await db.execute(
      'INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
      [userId, title, message, type]
    );
    return result;
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
    return null;
  }
}

export async function getUserNotifications(userId) {
  try {
    const notifications = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [userId]
    );
    const unreadCountRow = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return {
      notifications,
      unreadCount: unreadCountRow ? Number(unreadCountRow.count) : 0,
    };
  } catch (err) {
    console.error('[NotificationService] Failed to fetch notifications:', err.message);
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markAsRead(notificationId, userId) {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return true;
  } catch (err) {
    console.error('[NotificationService] Failed to mark as read:', err.message);
    return false;
  }
}

export async function markAllAsRead(userId) {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
    return true;
  } catch (err) {
    console.error('[NotificationService] Failed to mark all as read:', err.message);
    return false;
  }
}

export default {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
