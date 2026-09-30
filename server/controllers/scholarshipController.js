import db from '../config/database.js';
import { checkEligibility } from '../services/eligibilityService.js';
import { explainEligibility } from '../services/aiService.js';
import { logAuditAction } from '../middleware/auditMiddleware.js';

export async function getAllScholarships(req, res, next) {
  try {
    const {
      search,
      category,
      education_level,
      state,
      max_income,
      scholarship_type,
      sort_by = 'deadline',
    } = req.query;

    let sql = 'SELECT * FROM scholarships WHERE status = "active"';
    const params = [];

    if (search) {
      sql += ' AND (title LIKE ? OR provider LIKE ? OR description LIKE ? OR course LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (education_level && education_level !== 'all') {
      sql += ' AND (education_level LIKE ? OR education_level = "Any")';
      params.push(`%${education_level.trim()}%`);
    }

    if (scholarship_type && scholarship_type !== 'all') {
      sql += ' AND scholarship_type = ?';
      params.push(scholarship_type.trim());
    }

    if (max_income) {
      const inc = parseFloat(max_income);
      if (!isNaN(inc)) {
        sql += ' AND maximum_income >= ?';
        params.push(inc);
      }
    }

    if (state && state !== 'all') {
      sql += ' AND (eligible_states LIKE ? OR eligible_states LIKE "%All%")';
      params.push(`%${state.trim()}%`);
    }

    if (sort_by === 'deadline') {
      sql += ' ORDER BY application_deadline ASC';
    } else if (sort_by === 'amount_high') {
      sql += ' ORDER BY amount DESC';
    } else if (sort_by === 'newest') {
      sql += ' ORDER BY created_at DESC';
    } else {
      sql += ' ORDER BY application_deadline ASC';
    }

    const scholarships = await db.query(sql, params);

    // If student is logged in, attach personalized match score
    let studentProfile = null;
    if (req.user && req.user.role === 'student') {
      studentProfile = await db.get('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id]);
    }

    const enhanced = scholarships.map((s) => {
      const eligibility = studentProfile ? checkEligibility(studentProfile, s) : null;
      return {
        ...s,
        eligibility,
        matchPercentage: eligibility ? eligibility.matchPercentage : null,
        isEligible: eligibility ? eligibility.eligible : null,
      };
    });

    if (sort_by === 'relevance' && studentProfile) {
      enhanced.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
    }

    res.json({
      success: true,
      count: enhanced.length,
      scholarships: enhanced,
    });
  } catch (err) {
    next(err);
  }
}

export async function getScholarshipById(req, res, next) {
  try {
    const { id } = req.params;
    const scholarship = await db.get('SELECT * FROM scholarships WHERE id = ?', [id]);

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found.',
      });
    }

    let eligibility = null;
    let aiExplanation = null;

    if (req.user && req.user.role === 'student') {
      const studentProfile = await db.get(
        `SELECT sp.*, u.full_name, u.email 
         FROM student_profiles sp 
         JOIN users u ON sp.user_id = u.id 
         WHERE sp.user_id = ?`,
        [req.user.id]
      );
      if (studentProfile) {
        eligibility = checkEligibility(studentProfile, scholarship);
        aiExplanation = await explainEligibility(studentProfile, scholarship, eligibility);
      }
    }

    res.json({
      success: true,
      scholarship,
      eligibility,
      aiExplanation,
    });
  } catch (err) {
    next(err);
  }
}

export async function checkScholarshipEligibility(req, res, next) {
  try {
    const { id } = req.params;
    const scholarship = await db.get('SELECT * FROM scholarships WHERE id = ?', [id]);

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: 'Scholarship not found.',
      });
    }

    let studentProfile = null;
    if (req.user && req.user.role === 'student') {
      studentProfile = await db.get(
        `SELECT sp.*, u.full_name 
         FROM student_profiles sp 
         JOIN users u ON sp.user_id = u.id 
         WHERE sp.user_id = ?`,
        [req.user.id]
      );
    } else if (req.body.profile) {
      studentProfile = req.body.profile;
    }

    if (!studentProfile) {
      return res.status(400).json({
        success: false,
        message: 'No student profile provided to check eligibility.',
      });
    }

    const result = checkEligibility(studentProfile, scholarship);
    const aiExplanation = await explainEligibility(studentProfile, scholarship, result);

    res.json({
      success: true,
      eligibility: result,
      aiExplanation,
    });
  } catch (err) {
    next(err);
  }
}

export async function createScholarship(req, res, next) {
  try {
    const {
      title,
      provider,
      description,
      scholarship_type = 'Post-Matric',
      amount = 0,
      application_start,
      application_deadline,
      education_level = 'Any',
      course = 'All Courses',
      minimum_percentage = 0,
      maximum_income = 250000,
      eligible_states = 'All States',
      eligible_categories = 'Scheduled Tribe (ST)',
      required_documents,
      official_url,
      status = 'active',
    } = req.body;

    if (!title || !provider || !description || !application_start || !application_deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title, provider, description, start date, and deadline are required fields.',
      });
    }

    const result = await db.execute(
      `INSERT INTO scholarships (
        title, provider, description, scholarship_type, amount,
        application_start, application_deadline, education_level, course,
        minimum_percentage, maximum_income, eligible_states, eligible_categories,
        required_documents, official_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        title.trim(),
        provider.trim(),
        description.trim(),
        scholarship_type,
        parseFloat(amount) || 0,
        application_start,
        application_deadline,
        education_level.trim(),
        course.trim(),
        parseFloat(minimum_percentage) || 0,
        parseFloat(maximum_income) || 250000,
        eligible_states.trim(),
        eligible_categories.trim(),
        required_documents ? required_documents.trim() : null,
        official_url ? official_url.trim() : null,
        status,
      ]
    );

    const newId = result.insertId;
    await logAuditAction(req.user.id, 'CREATE_SCHOLARSHIP', 'scholarships', newId, req);

    res.status(201).json({
      success: true,
      message: 'Scholarship created successfully!',
      id: newId,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateScholarship(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      provider,
      description,
      scholarship_type,
      amount,
      application_start,
      application_deadline,
      education_level,
      course,
      minimum_percentage,
      maximum_income,
      eligible_states,
      eligible_categories,
      required_documents,
      official_url,
      status,
    } = req.body;

    const existing = await db.get('SELECT id FROM scholarships WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }

    await db.execute(
      `UPDATE scholarships SET
        title = COALESCE(?, title),
        provider = COALESCE(?, provider),
        description = COALESCE(?, description),
        scholarship_type = COALESCE(?, scholarship_type),
        amount = COALESCE(?, amount),
        application_start = COALESCE(?, application_start),
        application_deadline = COALESCE(?, application_deadline),
        education_level = COALESCE(?, education_level),
        course = COALESCE(?, course),
        minimum_percentage = COALESCE(?, minimum_percentage),
        maximum_income = COALESCE(?, maximum_income),
        eligible_states = COALESCE(?, eligible_states),
        eligible_categories = COALESCE(?, eligible_categories),
        required_documents = COALESCE(?, required_documents),
        official_url = COALESCE(?, official_url),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        title || null,
        provider || null,
        description || null,
        scholarship_type || null,
        amount !== undefined ? parseFloat(amount) : null,
        application_start || null,
        application_deadline || null,
        education_level || null,
        course || null,
        minimum_percentage !== undefined ? parseFloat(minimum_percentage) : null,
        maximum_income !== undefined ? parseFloat(maximum_income) : null,
        eligible_states || null,
        eligible_categories || null,
        required_documents || null,
        official_url || null,
        status || null,
        id,
      ]
    );

    await logAuditAction(req.user.id, 'UPDATE_SCHOLARSHIP', 'scholarships', id, req);

    res.json({
      success: true,
      message: 'Scholarship updated successfully!',
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteScholarship(req, res, next) {
  try {
    const { id } = req.params;
    await db.execute('UPDATE scholarships SET status = "inactive" WHERE id = ?', [id]);
    await logAuditAction(req.user.id, 'DEACTIVATE_SCHOLARSHIP', 'scholarships', id, req);

    res.json({
      success: true,
      message: 'Scholarship deactivated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getAllScholarships,
  getScholarshipById,
  checkScholarshipEligibility,
  createScholarship,
  updateScholarship,
  deleteScholarship,
};
