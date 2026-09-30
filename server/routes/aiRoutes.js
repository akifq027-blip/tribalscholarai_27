import express from 'express';
import { optionalAuth, authenticateToken } from '../middleware/authMiddleware.js';
import aiService from '../services/aiService.js';
import db from '../config/database.js';

const router = express.Router();

router.get('/vapi-config', optionalAuth, async (req, res) => {
  res.json({
    success: true,
    vapiPublicKey: process.env.VAPI_PUBLIC_KEY || '',
    vapiAssistantId: process.env.VAPI_ASSISTANT_ID || process.env.VAPI_ASSISTANCE_KEY || '',
    configured: Boolean(
      process.env.VAPI_PUBLIC_KEY &&
      (process.env.VAPI_ASSISTANT_ID || process.env.VAPI_ASSISTANCE_KEY)
    ),
  });
});

router.post('/chat', optionalAuth, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    let studentContext = null;
    if (req.user && req.user.role === 'student') {
      const profile = await db.get('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
      studentContext = {
        name: req.user.full_name,
        profile,
      };
    }

    const reply = await aiService.chatAssistant(message, studentContext);
    res.json({
      success: true,
      reply,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/explain-eligibility', authenticateToken, async (req, res, next) => {
  try {
    const { scholarshipId } = req.body;
    const scholarship = await db.get('SELECT * FROM scholarships WHERE id = ?', [scholarshipId]);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }

    const studentProfile = await db.get(
      'SELECT sp.*, u.full_name FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.user_id = ?',
      [req.user.id]
    );

    const { checkEligibility } = await import('../services/eligibilityService.js');
    const result = checkEligibility(studentProfile, scholarship);
    const explanation = await aiService.explainEligibility(studentProfile, scholarship, result);

    res.json({
      success: true,
      eligibility: result,
      explanation,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
