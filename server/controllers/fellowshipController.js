import db from '../config/database.js';
import { logAuditAction } from '../middleware/auditMiddleware.js';

export async function getAllFellowships(req, res, next) {
  try {
    const { search, status = 'active' } = req.query;
    let sql = 'SELECT * FROM fellowships WHERE status = ?';
    const params = [status];

    if (search) {
      sql += ' AND (title LIKE ? OR provider LIKE ? OR field_of_study LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY application_deadline ASC';
    const fellowships = await db.query(sql, params);

    res.json({
      success: true,
      count: fellowships.length,
      fellowships,
    });
  } catch (err) {
    next(err);
  }
}

export async function getFellowshipById(req, res, next) {
  try {
    const { id } = req.params;
    const fellowship = await db.get('SELECT * FROM fellowships WHERE id = ?', [id]);
    if (!fellowship) {
      return res.status(404).json({ success: false, message: 'Fellowship not found.' });
    }
    res.json({ success: true, fellowship });
  } catch (err) {
    next(err);
  }
}

export async function createFellowship(req, res, next) {
  try {
    const {
      title,
      provider,
      description,
      amount = 0,
      eligibility,
      application_start,
      application_deadline,
      field_of_study = 'All Fields',
      minimum_qualification = 'Post Graduate',
      required_documents,
      official_url,
      status = 'active',
    } = req.body;

    if (!title || !provider || !description || !eligibility || !application_start || !application_deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title, provider, description, eligibility, start date, and deadline are required.',
      });
    }

    const result = await db.execute(
      `INSERT INTO fellowships (
        title, provider, description, amount, eligibility,
        application_start, application_deadline, field_of_study,
        minimum_qualification, required_documents, official_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        title.trim(),
        provider.trim(),
        description.trim(),
        parseFloat(amount) || 0,
        eligibility.trim(),
        application_start,
        application_deadline,
        field_of_study.trim(),
        minimum_qualification.trim(),
        required_documents ? required_documents.trim() : null,
        official_url ? official_url.trim() : null,
        status,
      ]
    );

    const newId = result.insertId;
    await logAuditAction(req.user.id, 'CREATE_FELLOWSHIP', 'fellowships', newId, req);

    res.status(201).json({
      success: true,
      message: 'Fellowship created successfully!',
      id: newId,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getAllFellowships,
  getFellowshipById,
  createFellowship,
};
