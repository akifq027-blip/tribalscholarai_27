import db from '../config/database.js';
import { checkEligibility } from '../services/eligibilityService.js';
import { explainEligibility } from '../services/aiService.js';

/**
 * Calculates profile completeness score (0-100%)
 */
export function calculateProfileCompletion(profile) {
  if (!profile) return 0;
  const fields = [
    'date_of_birth',
    'gender',
    'category',
    'state',
    'district',
    'domicile',
    'annual_family_income',
    'education_level',
    'course',
    'institution_name',
    'year_of_study',
    'percentage',
    'bank_account_last4',
  ];

  let filled = 0;
  for (const field of fields) {
    if (profile[field] !== null && profile[field] !== undefined && profile[field] !== '') {
      filled++;
    }
  }

  return Math.round((filled / fields.length) * 100);
}

export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await db.get('SELECT id, full_name, email, phone, role FROM users WHERE id = ?', [userId]);
    let profile = await db.get('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);

    if (!profile) {
      await db.execute(
        'INSERT INTO student_profiles (user_id, category, created_at) VALUES (?, "Scheduled Tribe (ST)", CURRENT_TIMESTAMP)',
        [userId]
      );
      profile = await db.get('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
    }

    const completion = calculateProfileCompletion(profile);

    res.json({
      success: true,
      user,
      profile: {
        ...profile,
        completion,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      date_of_birth,
      gender,
      category = 'Scheduled Tribe (ST)',
      state,
      district,
      domicile,
      annual_family_income,
      education_level,
      course,
      institution_name,
      year_of_study,
      percentage,
      cgpa,
      bank_account_last4,
      full_name,
      phone,
    } = req.body;

    // Update user record if full_name or phone provided
    if (full_name || phone !== undefined) {
      await db.execute('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?', [
        full_name ? full_name.trim() : null,
        phone ? phone.trim() : null,
        userId,
      ]);
    }

    // Check if profile exists
    const existing = await db.get('SELECT id FROM student_profiles WHERE user_id = ?', [userId]);
    if (!existing) {
      await db.execute(
        `INSERT INTO student_profiles (
          user_id, date_of_birth, gender, category, state, district, domicile,
          annual_family_income, education_level, course, institution_name,
          year_of_study, percentage, cgpa, bank_account_last4, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          userId,
          date_of_birth || null,
          gender || null,
          category || 'Scheduled Tribe (ST)',
          state || null,
          district || null,
          domicile || null,
          annual_family_income ? parseFloat(annual_family_income) : null,
          education_level || null,
          course || null,
          institution_name || null,
          year_of_study ? parseInt(year_of_study, 10) : 1,
          percentage ? parseFloat(percentage) : null,
          cgpa ? parseFloat(cgpa) : null,
          bank_account_last4 ? String(bank_account_last4).slice(-4) : null,
        ]
      );
    } else {
      await db.execute(
        `UPDATE student_profiles SET
          date_of_birth = ?,
          gender = ?,
          category = ?,
          state = ?,
          district = ?,
          domicile = ?,
          annual_family_income = ?,
          education_level = ?,
          course = ?,
          institution_name = ?,
          year_of_study = ?,
          percentage = ?,
          cgpa = ?,
          bank_account_last4 = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
        [
          date_of_birth || null,
          gender || null,
          category || 'Scheduled Tribe (ST)',
          state || null,
          district || null,
          domicile || null,
          annual_family_income ? parseFloat(annual_family_income) : null,
          education_level || null,
          course || null,
          institution_name || null,
          year_of_study ? parseInt(year_of_study, 10) : 1,
          percentage ? parseFloat(percentage) : null,
          cgpa ? parseFloat(cgpa) : null,
          bank_account_last4 ? String(bank_account_last4).slice(-4) : null,
          userId,
        ]
      );
    }

    const updatedProfile = await db.get('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
    const completion = calculateProfileCompletion(updatedProfile);

    res.json({
      success: true,
      message: 'Student profile updated successfully!',
      profile: {
        ...updatedProfile,
        completion,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await db.get('SELECT id, full_name, email, phone, role FROM users WHERE id = ?', [userId]);
    const profile = await db.get('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
    const completion = calculateProfileCompletion(profile);

    // Fetch active scholarships
    const scholarships = await db.query(
      'SELECT * FROM scholarships WHERE status = "active" ORDER BY application_deadline ASC'
    );

    // Calculate match for each scholarship
    const scoredScholarships = scholarships.map((sch) => {
      const eligibility = checkEligibility(profile, sch);
      return {
        ...sch,
        eligibility,
        matchPercentage: eligibility.matchPercentage,
        isEligible: eligibility.eligible,
      };
    });

    // Top recommended
    const recommendedScholarships = [...scoredScholarships]
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 4);

    // Active applications of this student
    const applications = await db.query(
      `SELECT a.*, 
        s.title as scholarship_title, s.provider as scholarship_provider, s.amount as scholarship_amount,
        f.title as fellowship_title, f.provider as fellowship_provider, f.amount as fellowship_amount
       FROM applications a
       LEFT JOIN scholarships s ON a.scholarship_id = s.id
       LEFT JOIN fellowships f ON a.fellowship_id = f.id
       WHERE a.user_id = ?
       ORDER BY a.submitted_at DESC`,
      [userId]
    );

    // Deadlines calculations (upcoming within 90 days)
    const today = new Date();
    const upcomingDeadlines = scholarships
      .map((s) => {
        const deadline = new Date(s.application_deadline);
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: s.id,
          title: s.title,
          amount: s.amount,
          deadline: s.application_deadline,
          daysRemaining: diffDays,
        };
      })
      .filter((s) => s.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 4);

    // Unread notifications
    const unreadCountRow = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({
      success: true,
      student: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        profileCompletion: completion,
      },
      profile,
      recommendedScholarships,
      applications,
      upcomingDeadlines,
      unreadNotificationsCount: unreadCountRow ? Number(unreadCountRow.count) : 0,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  getProfile,
  updateProfile,
  getDashboard,
  calculateProfileCompletion,
};
