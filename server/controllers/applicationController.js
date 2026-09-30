import db from '../config/database.js';
import { createNotification } from '../services/notificationService.js';
import { logAuditAction } from '../middleware/auditMiddleware.js';

/**
 * Generates an official unique application identifier
 * Format: TS2026-XXXXXX
 */
async function generateApplicationNumber() {
  const currentYear = new Date().getFullYear();
  const countRow = await db.get('SELECT COUNT(*) as count FROM applications');
  const count = (countRow ? Number(countRow.count) : 0) + 101;
  const pad = String(count).padStart(6, '0');
  return `TS${currentYear}-${pad}`;
}

export async function submitApplication(req, res, next) {
  try {
    const userId = req.user.id;
    const { scholarship_id, fellowship_id, declaration_accepted } = req.body;

    if (!scholarship_id && !fellowship_id) {
      return res.status(400).json({
        success: false,
        message: 'Please specify a scholarship or fellowship to apply for.',
      });
    }

    if (!declaration_accepted) {
      return res.status(400).json({
        success: false,
        message: 'You must confirm the statutory declaration before submitting your application.',
      });
    }

    // Check if user already applied
    if (scholarship_id) {
      const existing = await db.get(
        'SELECT id, application_number FROM applications WHERE user_id = ? AND scholarship_id = ?',
        [userId, scholarship_id]
      );
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `You have already submitted an application (${existing.application_number}) for this scholarship.`,
        });
      }
    }

    // Get student profile
    const profile = await db.get('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
    if (!profile || !profile.institution_name) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your student profile (including institution and category) before applying.',
      });
    }

    const applicationNumber = await generateApplicationNumber();

    const result = await db.execute(
      `INSERT INTO applications (
        user_id, scholarship_id, fellowship_id, application_number,
        status, submitted_at, remarks, created_at
      ) VALUES (?, ?, ?, ?, 'SUBMITTED', CURRENT_TIMESTAMP, 'Application submitted by applicant. Awaiting document verification.', CURRENT_TIMESTAMP)`,
      [userId, scholarship_id || null, fellowship_id || null, applicationNumber]
    );

    const applicationId = result.insertId;

    // Create notification for student
    let schemeTitle = 'Scholarship';
    if (scholarship_id) {
      const sch = await db.get('SELECT title FROM scholarships WHERE id = ?', [scholarship_id]);
      if (sch) schemeTitle = sch.title;
    } else if (fellowship_id) {
      const fel = await db.get('SELECT title FROM fellowships WHERE id = ?', [fellowship_id]);
      if (fel) schemeTitle = fel.title;
    }

    await createNotification(
      userId,
      'Application Submitted',
      `Your application ${applicationNumber} for "${schemeTitle}" has been received and registered successfully.`,
      'success'
    );

    await logAuditAction(userId, 'SUBMIT_APPLICATION', 'applications', applicationId, req);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      applicationId,
      applicationNumber,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyApplications(req, res, next) {
  try {
    const userId = req.user.id;
    const applications = await db.query(
      `SELECT a.*, 
        s.title as scholarship_title, s.provider as scholarship_provider, s.amount as scholarship_amount, s.application_deadline as scholarship_deadline,
        f.title as fellowship_title, f.provider as fellowship_provider, f.amount as fellowship_amount
       FROM applications a
       LEFT JOIN scholarships s ON a.scholarship_id = s.id
       LEFT JOIN fellowships f ON a.fellowship_id = f.id
       WHERE a.user_id = ?
       ORDER BY a.submitted_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (err) {
    next(err);
  }
}

export async function getApplicationDetails(req, res, next) {
  try {
    const { id } = req.params;
    const application = await db.get(
      `SELECT a.*, 
        u.full_name as student_name, u.email as student_email, u.phone as student_phone,
        sp.category, sp.state, sp.district, sp.domicile, sp.annual_family_income,
        sp.education_level, sp.course, sp.institution_name, sp.percentage, sp.cgpa, sp.bank_account_last4,
        s.title as scholarship_title, s.provider as scholarship_provider, s.amount as scholarship_amount, s.official_url as scholarship_url,
        f.title as fellowship_title, f.provider as fellowship_provider, f.amount as fellowship_amount
       FROM applications a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN scholarships s ON a.scholarship_id = s.id
       LEFT JOIN fellowships f ON a.fellowship_id = f.id
       WHERE a.id = ?`,
      [id]
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    // Role check: Students can only view their own
    if (req.user.role === 'student' && application.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this application.',
      });
    }

    // Fetch documents
    const documents = await db.query(
      'SELECT * FROM documents WHERE application_id = ? ORDER BY uploaded_at ASC',
      [id]
    );

    // Compute interactive status timeline stages
    const stages = [
      { key: 'SUBMITTED', label: 'Application Submitted', completed: true, timestamp: application.submitted_at },
      {
        key: 'DOCUMENT_VERIFICATION',
        label: 'Document Verification',
        completed: ['DOCUMENT_VERIFICATION', 'INSTITUTE_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'DISBURSEMENT_PENDING', 'DISBURSED'].includes(application.status),
        active: application.status === 'DOCUMENT_VERIFICATION',
        timestamp: application.verified_at,
      },
      {
        key: 'INSTITUTE_VERIFICATION',
        label: 'Institute Verification',
        completed: ['INSTITUTE_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'DISBURSEMENT_PENDING', 'DISBURSED'].includes(application.status),
        active: application.status === 'INSTITUTE_VERIFICATION',
      },
      {
        key: 'UNDER_REVIEW',
        label: 'Department Review',
        completed: ['UNDER_REVIEW', 'APPROVED', 'DISBURSEMENT_PENDING', 'DISBURSED'].includes(application.status),
        active: application.status === 'UNDER_REVIEW',
      },
      {
        key: 'APPROVED',
        label: 'Approval by Welfare Directorate',
        completed: ['APPROVED', 'DISBURSEMENT_PENDING', 'DISBURSED'].includes(application.status),
        active: application.status === 'APPROVED',
        timestamp: application.approved_at,
      },
      {
        key: 'DISBURSED',
        label: 'DBT Fund Disbursement',
        completed: application.status === 'DISBURSED',
        active: application.status === 'DISBURSEMENT_PENDING',
      },
    ];

    if (application.status === 'REJECTED') {
      stages.push({
        key: 'REJECTED',
        label: 'Rejected',
        completed: true,
        active: true,
        timestamp: application.rejected_at,
        reason: application.rejection_reason,
      });
    }

    res.json({
      success: true,
      application,
      documents,
      timeline: stages,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateApplicationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, remarks, rejection_reason } = req.body;

    const validStatuses = [
      'DRAFT',
      'SUBMITTED',
      'DOCUMENT_VERIFICATION',
      'INSTITUTE_VERIFICATION',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'DISBURSEMENT_PENDING',
      'DISBURSED',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const application = await db.get('SELECT * FROM applications WHERE id = ?', [id]);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    let verified_at = application.verified_at;
    let approved_at = application.approved_at;
    let rejected_at = application.rejected_at;

    if (status === 'INSTITUTE_VERIFICATION' || status === 'UNDER_REVIEW') {
      verified_at = new Date().toISOString();
    }
    if (status === 'APPROVED' || status === 'DISBURSEMENT_PENDING' || status === 'DISBURSED') {
      approved_at = new Date().toISOString();
    }
    if (status === 'REJECTED') {
      rejected_at = new Date().toISOString();
    }

    await db.execute(
      `UPDATE applications SET
        status = ?,
        remarks = COALESCE(?, remarks),
        rejection_reason = COALESCE(?, rejection_reason),
        verified_at = ?,
        approved_at = ?,
        rejected_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        status,
        remarks || null,
        rejection_reason || null,
        verified_at || null,
        approved_at || null,
        rejected_at || null,
        id,
      ]
    );

    // Notify student
    const notifType = status === 'APPROVED' || status === 'DISBURSED' ? 'success' : status === 'REJECTED' ? 'danger' : 'info';
    await createNotification(
      application.user_id,
      `Application Status: ${status.replace(/_/g, ' ')}`,
      `Your application ${application.application_number} is now marked as "${status.replace(/_/g, ' ')}". ${remarks ? 'Officer remarks: ' + remarks : ''}`,
      notifType
    );

    await logAuditAction(req.user.id, `UPDATE_STATUS_${status}`, 'applications', id, req);

    res.json({
      success: true,
      message: `Application ${application.application_number} updated to ${status}.`,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  submitApplication,
  getMyApplications,
  getApplicationDetails,
  updateApplicationStatus,
};
