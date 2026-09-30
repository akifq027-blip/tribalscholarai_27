import fs from 'fs';
import path from 'path';
import multer from 'multer';
import db from '../config/database.js';
import { extractDocumentData } from '../services/aiService.js';
import { createNotification } from '../services/notificationService.js';
import { logAuditAction } from '../middleware/auditMiddleware.js';

// Setup uploads directory
const uploadsDir = path.resolve(process.cwd(), 'server/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const unique = `${Date.now()}_${safeName}${ext}`;
    cb(null, unique);
  },
});

// File filter (MIME & extension validation)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, JPG, and PNG files are accepted.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file was uploaded or file type is not supported.',
      });
    }

    const { application_id, document_type } = req.body;

    if (!application_id || !document_type) {
      // Remove uploaded file to prevent orphans
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Application ID and document type are required.',
      });
    }

    // Verify application belongs to student or user is admin
    const application = await db.get('SELECT * FROM applications WHERE id = ?', [application_id]);
    if (!application) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (req.user.role === 'student' && application.user_id !== req.user.id) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const filePath = `/uploads/${req.file.filename}`;

    const result = await db.execute(
      `INSERT INTO documents (
        application_id, document_type, file_name, file_path,
        verification_status, uploaded_at
      ) VALUES (?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)`,
      [application_id, document_type.trim(), req.file.originalname, filePath]
    );

    const docId = result.insertId;
    await logAuditAction(req.user.id, 'UPLOAD_DOCUMENT', 'documents', docId, req);

    res.status(201).json({
      success: true,
      message: `${document_type} uploaded successfully.`,
      document: {
        id: docId,
        application_id,
        document_type,
        file_name: req.file.originalname,
        file_path: filePath,
        verification_status: 'PENDING',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyDocument(req, res, next) {
  try {
    const { id } = req.params;
    const { verification_status, verification_remarks } = req.body;

    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(verification_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be PENDING, VERIFIED, or REJECTED.',
      });
    }

    const doc = await db.get(
      `SELECT d.*, a.user_id, a.application_number 
       FROM documents d 
       JOIN applications a ON d.application_id = a.id 
       WHERE d.id = ?`,
      [id]
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    await db.execute(
      `UPDATE documents SET
        verification_status = ?,
        verification_remarks = ?,
        verified_at = ?
      WHERE id = ?`,
      [
        verification_status,
        verification_remarks || null,
        verification_status === 'VERIFIED' ? new Date().toISOString() : null,
        id,
      ]
    );

    // Notify student if rejected or verified
    if (verification_status === 'REJECTED') {
      await createNotification(
        doc.user_id,
        'Document Verification Alert',
        `Your document "${doc.document_type}" for application ${doc.application_number} was rejected. Reason: ${verification_remarks || 'Document illegible or mismatch'}. Please upload a clear valid copy.`,
        'danger'
      );
    } else if (verification_status === 'VERIFIED') {
      await createNotification(
        doc.user_id,
        'Document Verified',
        `Your "${doc.document_type}" for application ${doc.application_number} has been verified successfully.`,
        'success'
      );
    }

    await logAuditAction(req.user.id, `VERIFY_DOC_${verification_status}`, 'documents', id, req);

    res.json({
      success: true,
      message: `Document status updated to ${verification_status}.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function ocrExtractDocument(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await db.get(
      `SELECT d.*, a.user_id, a.application_number 
       FROM documents d 
       JOIN applications a ON d.application_id = a.id 
       WHERE d.id = ?`,
      [id]
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const studentProfile = await db.get(
      `SELECT sp.*, u.full_name 
       FROM student_profiles sp 
       JOIN users u ON sp.user_id = u.id 
       WHERE sp.user_id = ?`,
      [doc.user_id]
    );

    const extraction = await extractDocumentData(doc.document_type, studentProfile, doc.file_name);

    res.json({
      success: true,
      extraction,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  upload,
  uploadDocument,
  verifyDocument,
  ocrExtractDocument,
};
