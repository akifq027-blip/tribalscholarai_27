import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tribalscholar_secure_jwt_secret_2026_sih';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get(
      'SELECT id, full_name, email, phone, role, is_active FROM users WHERE id = ?',
      [decoded.userId || decoded.id]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or session expired.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token. Please log in again.',
    });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    db.get('SELECT id, full_name, email, phone, role, is_active FROM users WHERE id = ?', [decoded.userId || decoded.id])
      .then((user) => {
        if (user && user.is_active) req.user = user;
        next();
      })
      .catch(() => next());
  } catch (e) {
    next();
  }
}

export default {
  authenticateToken,
  optionalAuth,
};
