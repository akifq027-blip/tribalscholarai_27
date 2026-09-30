import db from '../config/database.js';
import { createNotification } from '../services/notificationService.js';
import { logAuditAction } from '../middleware/auditMiddleware.js';

export async function getAssignedApplications(req, res, next) {
  try {
    const { status, search } = req.query;

    let sql = `
      SELECT a.*, 
        u.full_name as student_name, u.email as student_email, u.phone as student_phone,
        sp.category, sp.state, sp.district, sp.course, sp.institution_name, sp.year_of_study, sp.percentage, sp.cgpa,
        s.title as scholarship_title, s.provider as scholarship_provider, s.amount as scholarship_amount
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN scholarships s ON a.scholarship_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (a.application_number LIKE ? OR u.full_name LIKE ? OR sp.institution_name LIKE ? OR s.title LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY a.submitted_at DESC';

    const applications = await db.query(sql, params);

    // Calculate metrics for institute officer
    const total = applications.length;
    const pending = applications.filter((a) => ['SUBMITTED', 'DOCUMENT_VERIFICATION', 'INSTITUTE_VERIFICATION'].includes(a.status)).length;
    const approved = applications.filter((a) => ['APPROVED', 'DISBURSED'].includes(a.status)).length;

    res.json({
      success: true,
      stats: { total, pending, approved },
      applications,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyInstituteApplication(req, res, next) {
  try {
    const { applicationId, action, remarks, rejectionReason } = req.body;

    if (!applicationId || !action) {
      return res.status(400).json({
        success: false,
        message: 'Application ID and action are required.',
      });
    }

    const application = await db.get('SELECT * FROM applications WHERE id = ?', [applicationId]);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    let newStatus = 'UNDER_REVIEW';
    let msg = 'Institute verified application and forwarded to Tribal Welfare Directorate.';
    if (action === 'FORWARD') {
      newStatus = 'UNDER_REVIEW';
    } else if (action === 'APPROVE') {
      newStatus = 'APPROVED';
      msg = 'Application directly approved by Institute Authority.';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
      msg = `Application rejected by Institute: ${rejectionReason || 'Details mismatch'}`;
    }

    await db.execute(
      `UPDATE applications SET
        status = ?,
        remarks = ?,
        rejection_reason = ?,
        verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [newStatus, remarks || msg, action === 'REJECT' ? (rejectionReason || 'Academic verification failed') : null, applicationId]
    );

    // Notify student
    await createNotification(
      application.user_id,
      `Institute Verification: ${action === 'REJECT' ? 'Rejected' : 'Verified'}`,
      `Your application ${application.application_number} was processed by your Institution Nodal Officer. Status: ${newStatus}. Remarks: ${remarks || 'Institutional record verified.'}`,
      action === 'REJECT' ? 'danger' : 'success'
    );

    await logAuditAction(req.user.id, `INSTITUTE_VERIFY_${action}`, 'applications', applicationId, req);

    res.json({
      success: true,
      message: `Application successfully updated to ${newStatus}.`,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getAssignedApplications,
  verifyInstituteApplication,
};
