-- ========================================================
-- TribalScholar AI - Database Schema (MySQL 8.0+)
-- AI-Enabled Scholarship and Fellowship Management System
-- For Scheduled Tribe (ST) Students
-- ========================================================

-- Drop tables if needed in reverse dependency order
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS fellowships;
DROP TABLE IF EXISTS scholarships;
DROP TABLE IF EXISTS student_profiles;
DROP TABLE IF EXISTS users;

-- --------------------------------------------------------
-- 1. USERS TABLE
-- --------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(20) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'institute', 'admin', 'super_admin') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. STUDENT PROFILES TABLE
-- --------------------------------------------------------
CREATE TABLE student_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  date_of_birth DATE DEFAULT NULL,
  gender ENUM('Male', 'Female', 'Other') DEFAULT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Scheduled Tribe (ST)',
  state VARCHAR(100) DEFAULT NULL,
  district VARCHAR(100) DEFAULT NULL,
  domicile VARCHAR(100) DEFAULT NULL,
  annual_family_income DECIMAL(12, 2) DEFAULT NULL,
  education_level VARCHAR(100) DEFAULT NULL,
  course VARCHAR(150) DEFAULT NULL,
  institution_name VARCHAR(200) DEFAULT NULL,
  year_of_study INT DEFAULT 1,
  percentage DECIMAL(5, 2) DEFAULT NULL,
  cgpa DECIMAL(4, 2) DEFAULT NULL,
  bank_account_last4 VARCHAR(4) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_profile_category (category),
  INDEX idx_profile_income (annual_family_income),
  INDEX idx_profile_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. SCHOLARSHIPS TABLE
-- --------------------------------------------------------
CREATE TABLE scholarships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  provider VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  scholarship_type ENUM('Pre-Matric', 'Post-Matric', 'Higher-Education', 'Merit-Based', 'Overseas', 'Special-Incentive') NOT NULL DEFAULT 'Post-Matric',
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  application_start DATE NOT NULL,
  application_deadline DATE NOT NULL,
  education_level VARCHAR(150) DEFAULT 'Any',
  course VARCHAR(200) DEFAULT 'All Courses',
  minimum_percentage DECIMAL(5, 2) DEFAULT 0.00,
  maximum_income DECIMAL(12, 2) DEFAULT 250000.00,
  eligible_states VARCHAR(500) DEFAULT 'All States',
  eligible_categories VARCHAR(255) DEFAULT 'Scheduled Tribe (ST)',
  required_documents TEXT DEFAULT NULL,
  official_url VARCHAR(500) DEFAULT NULL,
  status ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scholarships_status (status),
  INDEX idx_scholarships_deadline (application_deadline),
  INDEX idx_scholarships_type (scholarship_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. FELLOWSHIPS TABLE
-- --------------------------------------------------------
CREATE TABLE fellowships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  provider VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  eligibility TEXT NOT NULL,
  application_start DATE NOT NULL,
  application_deadline DATE NOT NULL,
  field_of_study VARCHAR(200) DEFAULT 'All Fields',
  minimum_qualification VARCHAR(150) DEFAULT 'Post Graduate',
  required_documents TEXT DEFAULT NULL,
  official_url VARCHAR(500) DEFAULT NULL,
  status ENUM('active', 'inactive', 'draft') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fellowships_status (status),
  INDEX idx_fellowships_deadline (application_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. APPLICATIONS TABLE
-- --------------------------------------------------------
CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  scholarship_id INT DEFAULT NULL,
  fellowship_id INT DEFAULT NULL,
  application_number VARCHAR(50) NOT NULL UNIQUE,
  status ENUM(
    'DRAFT',
    'SUBMITTED',
    'DOCUMENT_VERIFICATION',
    'INSTITUTE_VERIFICATION',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'DISBURSEMENT_PENDING',
    'DISBURSED'
  ) NOT NULL DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  rejected_at TIMESTAMP NULL DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE SET NULL,
  FOREIGN KEY (fellowship_id) REFERENCES fellowships(id) ON DELETE SET NULL,
  INDEX idx_apps_user (user_id),
  INDEX idx_apps_status (status),
  INDEX idx_apps_app_no (application_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. DOCUMENTS TABLE
-- --------------------------------------------------------
CREATE TABLE documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  verification_remarks TEXT DEFAULT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_doc_app (application_id),
  INDEX idx_doc_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. NOTIFICATIONS TABLE
-- --------------------------------------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'danger') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. AUDIT LOGS TABLE
-- --------------------------------------------------------
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
