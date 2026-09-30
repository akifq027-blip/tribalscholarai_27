import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { logAuditAction } from '../middleware/auditMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tribalscholar_secure_jwt_secret_2026_sih';
const JWT_EXPIRES_IN = '7d';

export async function register(req, res, next) {
  try {
    const { full_name, email, phone, password, role = 'student' } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required fields.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if user already exists
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    // Role validation: public can only register as student or institute
    const validRoles = ['student', 'institute'];
    const assignedRole = validRoles.includes(role) ? role : 'student';

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.execute(
      'INSERT INTO users (full_name, email, phone, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)',
      [full_name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : null, password_hash, assignedRole]
    );

    const newUserId = result.insertId;

    // If student, create empty profile
    if (assignedRole === 'student') {
      await db.execute(
        'INSERT INTO student_profiles (user_id, category, created_at) VALUES (?, "Scheduled Tribe (ST)", CURRENT_TIMESTAMP)',
        [newUserId]
      );
    }

    // Generate JWT
    const token = jwt.sign({ userId: newUserId, role: assignedRole }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await logAuditAction(newUserId, 'REGISTER', 'users', newUserId, req);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUserId,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        role: assignedRole,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the welfare administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await logAuditAction(user.id, 'LOGIN', 'users', user.id, req);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    if (req.user) {
      await logAuditAction(req.user.id, 'LOGOUT', 'users', req.user.id, req);
    }
    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'student') {
      profile = await db.get('SELECT * FROM student_profiles WHERE user_id = ?', [user.id]);
    }

    res.json({
      success: true,
      user,
      profile,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  register,
  login,
  logout,
  getMe,
};
