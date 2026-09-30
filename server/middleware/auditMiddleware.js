import db from '../config/database.js';

export async function logAuditAction(userId, action, entityType, entityId, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [userId || null, action, entityType, entityId || null, String(ip)]
    );
  } catch (err) {
    console.error('[AuditMiddleware] Failed to write audit log:', err.message);
  }
}

export default {
  logAuditAction,
};
