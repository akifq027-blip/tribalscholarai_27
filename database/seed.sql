-- ========================================================
-- TribalScholar AI - Seed Data (Realistic Government Schemes & Demo Users)
-- Passwords for demo users are all: password123
-- Bcrypt Hash: $2b$10$/DSj4sMx2PS7r74D7piN4.MskfuCw1CZLI5dSDCNzmy5cyugVwEMC
-- ========================================================

-- --------------------------------------------------------
-- 1. SEED USERS
-- --------------------------------------------------------
INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active, created_at) VALUES
(1, 'Ramesh Birhor', 'student@example.com', '+91 98765 43210', '$2b$10$/DSj4sMx2PS7r74D7piN4.MskfuCw1CZLI5dSDCNzmy5cyugVwEMC', 'student', 1, '2026-08-01 10:00:00'),
(2, 'Sunita Soren', 'sunita.soren@example.com', '+91 98765 43211', '$2b$10$/DSj4sMx2PS7r74D7piN4.MskfuCw1CZLI5dSDCNzmy5cyugVwEMC', 'student', 1, '2026-08-05 11:30:00'),
(3, 'Dr. Arindam Senapati', 'institute@example.com', '+91 98765 43220', '$2b$10$/DSj4sMx2PS7r74D7piN4.MskfuCw1CZLI5dSDCNzmy5cyugVwEMC', 'institute', 1, '2026-07-15 09:00:00'),
(4, 'Shri Rajesh Munda (Director)', 'admin@example.com', '+91 98765 43230', '$2b$10$/DSj4sMx2PS7r74D7piN4.MskfuCw1CZLI5dSDCNzmy5cyugVwEMC', 'admin', 1, '2026-07-01 08:00:00'),
(5, 'Dr. Meenakshi Oraon (Joint Secretary)', 'superadmin@example.com', '+91 98765 43240', '$2b$10$/DSj4sMx2PS7r74D7piN4.MskfuCw1CZLI5dSDCNzmy5cyugVwEMC', 'super_admin', 1, '2026-06-01 08:00:00');

-- --------------------------------------------------------
-- 2. SEED STUDENT PROFILES
-- --------------------------------------------------------
INSERT INTO student_profiles (id, user_id, date_of_birth, gender, category, state, district, domicile, annual_family_income, education_level, course, institution_name, year_of_study, percentage, cgpa, bank_account_last4, created_at) VALUES
(1, 1, '2004-05-14', 'Male', 'Scheduled Tribe (ST)', 'Odisha', 'Mayurbhanj', 'Odisha', 180000.00, 'Undergraduate', 'B.Tech Computer Science and Engineering', 'National Institute of Technology Rourkela', 3, 84.50, 8.45, '4921', '2026-08-01 10:15:00'),
(2, 2, '2003-11-22', 'Female', 'Scheduled Tribe (ST)', 'Jharkhand', 'Ranchi', 'Jharkhand', 120000.00, 'Postgraduate', 'M.Sc Biotechnology', 'Birsa Agricultural University', 1, 88.20, 8.82, '7712', '2026-08-05 11:45:00');

-- --------------------------------------------------------
-- 3. SEED SCHOLARSHIPS
-- --------------------------------------------------------
INSERT INTO scholarships (id, title, provider, description, scholarship_type, amount, application_start, application_deadline, education_level, course, minimum_percentage, maximum_income, eligible_states, eligible_categories, required_documents, official_url, status, created_at) VALUES
(1, 'National Fellowship and Scholarship for Higher Education of ST Students', 'Ministry of Tribal Affairs, Govt. of India', 'Provides financial assistance to meritorious ST students for pursuing graduate and post-graduate professional courses in notified Top-Class Institutes across India. Covers full tuition fee, living allowance, and book grants.', 'Higher-Education', 250000.00, '2026-07-01', '2026-11-30', 'Undergraduate', 'B.Tech, MBBS, MBA, Law, Architecture', 60.00, 600000.00, 'All States', 'Scheduled Tribe (ST)', 'Income Certificate, ST Caste Certificate, 12th Marksheet, Institute Admission Letter, Bank Passbook', 'https://tribal.nic.in/ScholarshiP.aspx', 'active', '2026-07-01 09:00:00'),
(2, 'Post-Matric Scholarship Scheme for ST Students', 'Department of Scheduled Tribes & Welfare', 'Centrally sponsored scheme implemented through State Governments/UT administrations to provide financial assistance to Scheduled Tribe students studying at post-matriculation or post-secondary stage.', 'Post-Matric', 35000.00, '2026-08-01', '2026-12-15', 'Undergraduate', 'All Degree & Diploma Courses', 50.00, 250000.00, 'All States', 'Scheduled Tribe (ST)', 'Caste Certificate, Income Certificate, Previous Year Marksheet, Fee Receipt, Bank Account Proof', 'https://scholarships.gov.in', 'active', '2026-07-05 10:00:00'),
(3, 'Top Class Education Scheme for Scheduled Tribe Students', 'Ministry of Tribal Affairs', 'Recognizes and promotes quality education among ST students by funding their education in premier institutions such as IITs, NITs, IIMs, AIIMS, and National Law Universities.', 'Merit-Based', 320000.00, '2026-07-15', '2026-10-31', 'Undergraduate', 'Engineering, Medicine, Management, Law', 75.00, 600000.00, 'All States', 'Scheduled Tribe (ST)', 'Rank Card / Allotment Letter, ST Certificate, Income Proof, Fee Structure', 'https://tribal.nic.in/topclass.aspx', 'active', '2026-07-10 11:00:00'),
(4, 'National Overseas Scholarship for Scheduled Tribe Students (NOS)', 'Ministry of Tribal Affairs, Govt. of India', 'Provides financial assistance to selected ST candidates for pursuing Master level courses, Ph.D. and Post-Doctoral research abroad in specified fields like Engineering, Pure Sciences, and Humanities.', 'Overseas', 1800000.00, '2026-06-01', '2026-10-15', 'Postgraduate', 'Science, Technology, Agriculture, Medicine', 65.00, 800000.00, 'All States', 'Scheduled Tribe (ST)', 'Passport, Foreign University Offer Letter, GRE/TOEFL/IELTS score, ST Certificate, Income Affidavit', 'https://overseas.tribal.gov.in', 'active', '2026-06-01 08:30:00'),
(5, 'Pre-Matric Scholarship for Needy Scheduled Tribe Students (Class 9 & 10)', 'Ministry of Tribal Affairs', 'Supports tribal parents for education of their wards studying in classes IX and X so that the incidence of drop-out, especially in the transition from elementary to secondary stage, is minimized.', 'Pre-Matric', 12000.00, '2026-08-01', '2026-11-15', 'Secondary', 'Class 9 and 10', 45.00, 250000.00, 'All States', 'Scheduled Tribe (ST)', 'School Enrollment Certificate, ST Caste Certificate, Family Income Declaration', 'https://tribal.nic.in', 'active', '2026-07-01 09:00:00'),
(6, 'Special Tribal Girls STEM Excellence Fellowship', 'National Scheduled Tribes Finance and Development Corporation', 'Encourages Scheduled Tribe female students entering STEM (Science, Technology, Engineering, Mathematics) higher education with an annual stipend, laptop allowance, and research mentoring.', 'Special-Incentive', 75000.00, '2026-08-10', '2026-12-31', 'Undergraduate', 'B.Tech, B.Sc Honours, Integrated M.Sc', 70.00, 350000.00, 'All States', 'Scheduled Tribe (ST)', 'Gender Verification, ST Certificate, Income Certificate, College ID', 'https://nstfdc.tribal.gov.in', 'active', '2026-08-01 12:00:00');

-- --------------------------------------------------------
-- 4. SEED FELLOWSHIPS
-- --------------------------------------------------------
INSERT INTO fellowships (id, title, provider, description, amount, eligibility, application_start, application_deadline, field_of_study, minimum_qualification, required_documents, official_url, status, created_at) VALUES
(1, 'Eklavya Tribal Research Fellowship (M.Phil / Ph.D.)', 'Tribal Research Institute (TRI)', 'Fellowship for doctoral and post-doctoral research focusing on indigenous knowledge systems, tribal culture preservation, tribal health, and customary laws.', 420000.00, 'Full-time registered ST scholars in UGC recognized universities with at least 55% in Post Graduation.', '2026-07-01', '2026-11-20', 'Tribal Studies, Anthropology, Social Sciences, Linguistics', 'Master Degree', 'Synopsis of Research, Supervisor Recommendation, ST Certificate, PG Marksheet', 'https://tri.tribal.gov.in/fellowship', 'active', '2026-07-01 10:00:00'),
(2, 'Birsa Munda Post-Doctoral Innovation Fellowship', 'Ministry of Science & Technology and Ministry of Tribal Affairs', 'Supports ST innovators and post-doctoral fellows working on grassroots tribal technologies, forest product processing, and renewable energy in tribal hamlets.', 540000.00, 'Ph.D. degree holder from an ST community under 40 years of age.', '2026-08-01', '2026-12-10', 'Applied Sciences, Bio-resources, Renewable Energy, Environmental Science', 'Ph.D. / Doctorate', 'Ph.D. Degree Copy, Innovation Project Proposal, ST Certificate, Publications list', 'https://dst.gov.in/st-fellowship', 'active', '2026-08-01 14:00:00');

-- --------------------------------------------------------
-- 5. SEED APPLICATIONS
-- --------------------------------------------------------
INSERT INTO applications (id, user_id, scholarship_id, fellowship_id, application_number, status, submitted_at, verified_at, approved_at, remarks, created_at) VALUES
(1, 1, 1, NULL, 'TS2026-000101', 'INSTITUTE_VERIFICATION', '2026-08-15 14:20:00', NULL, NULL, 'Documents uploaded and preliminary auto-check passed. Awaiting Institute verification.', '2026-08-15 14:20:00'),
(2, 1, 2, NULL, 'TS2026-000102', 'APPROVED', '2026-08-10 09:15:00', '2026-08-20 16:30:00', '2026-09-01 11:00:00', 'Approved by State Tribal Welfare Department. Queued for DBT bank disbursement.', '2026-08-10 09:15:00'),
(3, 2, 6, NULL, 'TS2026-000103', 'DOCUMENT_VERIFICATION', '2026-08-28 17:00:00', NULL, NULL, 'Income certificate under scrutiny. Verification officer assigned.', '2026-08-28 17:00:00');

-- --------------------------------------------------------
-- 6. SEED DOCUMENTS
-- --------------------------------------------------------
INSERT INTO documents (id, application_id, document_type, file_name, file_path, verification_status, verification_remarks, uploaded_at, verified_at) VALUES
(1, 1, 'ST Caste Certificate', 'ramesh_st_caste_cert.pdf', '/uploads/demo/ramesh_st_caste_cert.pdf', 'VERIFIED', 'Certificate verified via DigiLocker / District Revenue portal (Certificate No: OR-ST-2022-8921)', '2026-08-15 14:22:00', '2026-08-16 10:00:00'),
(2, 1, 'Income Certificate', 'ramesh_income_cert_2026.pdf', '/uploads/demo/ramesh_income_cert_2026.pdf', 'VERIFIED', 'Income matches ₹1,80,000 threshold issued by Tahsildar Baripada', '2026-08-15 14:23:00', '2026-08-16 10:05:00'),
(3, 1, 'Previous Marksheet (Sem 4)', 'ramesh_grade_card_sem4.pdf', '/uploads/demo/ramesh_grade_card_sem4.pdf', 'PENDING', 'Under verification by NIT Rourkela Academic Cell', '2026-08-15 14:25:00', NULL),
(4, 1, 'College Bonafide Certificate', 'ramesh_nitr_bonafide.pdf', '/uploads/demo/ramesh_nitr_bonafide.pdf', 'VERIFIED', 'Verified by Institute Nodal Officer', '2026-08-15 14:26:00', '2026-08-17 14:00:00'),
(5, 2, 'ST Caste Certificate', 'ramesh_st_caste_cert.pdf', '/uploads/demo/ramesh_st_caste_cert.pdf', 'VERIFIED', 'Verified and authentic', '2026-08-10 09:20:00', '2026-08-12 11:00:00'),
(6, 2, 'Income Certificate', 'ramesh_income_cert_2026.pdf', '/uploads/demo/ramesh_income_cert_2026.pdf', 'VERIFIED', 'Valid within ₹2.5 Lakh limit', '2026-08-10 09:21:00', '2026-08-12 11:05:00');

-- --------------------------------------------------------
-- 7. SEED NOTIFICATIONS
-- --------------------------------------------------------
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES
(1, 1, 'Application Approved', 'Congratulations! Your application TS2026-000102 for Post-Matric Scholarship Scheme for ST Students has been APPROVED by the Directorate.', 'success', 0, '2026-09-01 11:00:00'),
(2, 1, 'Institute Verification In Progress', 'Application TS2026-000101 was forwarded to National Institute of Technology Rourkela for verification.', 'info', 1, '2026-08-16 11:30:00'),
(3, 1, 'Upcoming Scheme Deadline', 'Deadline for Top Class Education Scheme for ST Students is 31 Oct 2026. Check your eligibility and apply.', 'warning', 0, '2026-09-10 09:00:00'),
(4, 3, 'New Application For Verification', 'Application TS2026-000101 (Ramesh Birhor - B.Tech CSE) is pending your verification.', 'info', 0, '2026-08-16 11:30:00'),
(5, 4, 'Verification Milestone', 'Over 120 applications verified across Odisha and Jharkhand district portals this week.', 'info', 0, '2026-09-15 10:00:00');

-- --------------------------------------------------------
-- 8. SEED AUDIT LOGS
-- --------------------------------------------------------
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, created_at) VALUES
(1, 4, 'CREATE_SCHOLARSHIP', 'scholarships', 1, '192.168.1.10', '2026-07-01 09:00:00'),
(2, 1, 'SUBMIT_APPLICATION', 'applications', 1, '103.21.124.5', '2026-08-15 14:20:00'),
(3, 3, 'VERIFY_DOCUMENT', 'documents', 1, '14.139.211.2', '2026-08-16 10:00:00'),
(4, 4, 'APPROVE_APPLICATION', 'applications', 2, '192.168.1.10', '2026-09-01 11:00:00');
