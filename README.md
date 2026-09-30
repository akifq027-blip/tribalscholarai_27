# TribalScholar AI – AI-Enabled Scholarship & Fellowship Management System for Scheduled Tribes

TribalScholar AI is an enterprise-grade, responsive full-stack platform built for the **Ministry of Tribal Affairs and State Scheduled Tribe Welfare Directorates**. It streamlines scholarship discovery, guarantees statutory merit compliance through a deterministic eligibility engine, assists officers with OCR/AI verification, and offers real-time DBT tracking.

---

## 🌟 Key Features

1. **Deterministic Statutory Eligibility Engine (`eligibilityService.js`)**:
   - Zero hallucination guarantee: Evaluates Scheduled Tribe (ST) category verification, annual family income thresholds, academic percentage/CGPA requirements, course alignment, and domicile state.
   - Calculates dynamic match score (0-100%) with structured criteria pass/fail reports.
2. **AI Guidance & Explanation Layer (`aiService.js`)**:
   - Powered server-side by Google Gemini (`gemini-3.8-flash`) via the modern `@google/genai` SDK.
   - Provides personalized, encouraging explanations and document preparation checklists.
   - AI Student Counselor ("*Ask TribalScholar AI*") grounded strictly in official scheme databases.
   - **Real-Time Vapi AI Voice Assistance (`@vapi-ai/web`)**: Live voice calling with WebRTC, animated voice sound wave visualizer, microphone mute/unmute, call timer, and speech-to-text live transcription into the chat conversation.
   - OCR & Certificate Inspection simulation comparing Tahsildar seals, certificate numbers, and dates against student records.
3. **Multi-Stage Application Lifecycle & Tracking**:
   - Status workflow: `DRAFT` &rarr; `SUBMITTED` &rarr; `DOCUMENT_VERIFICATION` &rarr; `INSTITUTE_VERIFICATION` &rarr; `UNDER_REVIEW` &rarr; `APPROVED` &rarr; `DISBURSEMENT_PENDING` &rarr; `DISBURSED`.
   - Unique application ID generation (`TS2026-XXXXXX`).
   - Interactive visual timeline showing progress, officer remarks, and timestamps.
4. **Document Scrutiny Desk**:
   - Multer file upload supporting PDF, JPG, and PNG up to 5MB.
   - Instant automated OCR comparison between certificates and student profiles.
5. **Role-Based Access Control (RBAC)**:
   - **Student Portal**: Simple, clutter-free dashboard, 6-step profile wizard, deadline alerts, application tracking.
   - **Institute Verification Portal**: Nodal officers inspect enrolled students, verify grade cards, add official remarks, and forward/reject applications.
   - **Welfare Admin Command Center**: Metric counters, Chart.js operational visualizations, full scholarship CRUD, application status transitions, student directory, analytics, and security audit logs.
6. **Portal Theme Persistence**:
   - Supports 3 distinct themes (`gov`, `tribal`, `contrast`) selectable via `.theme-preview-selector`, saved persistently in `localStorage` and applied on page load.

---

## 🛠️ Technology Stack

- **Frontend**: Semantic HTML5, Modern CSS3 (Grid, Flexbox, CSS Variables), Vanilla JavaScript (ES6+ Modules, Fetch API, FormData), Chart.js (for analytics).
- **Backend**: Node.js, Express.js REST API with clean service-oriented modular architecture.
- **Database**:
  - Primary: **MySQL 8.0+** (`mysql2/promise` connection pool).
  - Built-in Seamless Fallback: Embedded persistent SQL engine (`sql.js` WebAssembly SQLite) ensuring the app works out-of-the-box in local preview environments without external daemons.
- **Security**: JWT authentication, bcryptjs password hashing, SQL parameterization, file upload MIME validation, role authorization middleware, immutable audit logging.

---

## 📁 Project Directory Structure

```text
tribalscholar-ai/
├── client/
│   ├── index.html                   # Official portal landing page
│   ├── login.html                   # Authentication login & demo role filler
│   ├── register.html                # Student & Institute registration
│   ├── dashboard.html               # Main Student Experience dashboard
│   ├── profile.html                 # Multi-step profile form
│   ├── scholarships.html            # Scholarship discovery & search
│   ├── scholarship-details.html     # Scheme details, rules breakdown, apply wizard
│   ├── applications.html            # Student application tracking list
│   ├── application-details.html     # Interactive timeline & document management
│   ├── notifications.html           # Real-time alerts & milestone updates
│   ├── institute/
│   │   └── dashboard.html           # Institute verification desk
│   ├── admin/
│   │   ├── dashboard.html           # Admin command center with Chart.js
│   │   ├── scholarships.html        # Scheme CRUD management
│   │   ├── applications.html        # Directorate application processing
│   │   ├── students.html            # Student roster & account toggle
│   │   ├── analytics.html           # Operational analytics & bottleneck monitoring
│   │   └── audit-logs.html          # Security audit trail
│   ├── css/
│   │   ├── global.css               # Portal themes, gov banner, typography
│   │   ├── components.css           # Badges, timeline, cards, modal, AI drawer
│   │   └── responsive.css           # Mobile & tablet responsiveness
│   └── js/
│       ├── api.js                   # Centralized API fetch wrapper & toasts
│       ├── auth.js                  # Auth state, guards, demo fast-login
│       ├── theme.js                 # Theme switcher (.theme-preview-selector)
│       └── chat.js                  # "Ask TribalScholar AI" floating counselor
├── server/
│   ├── config/
│   │   └── database.js              # Dual-driver MySQL & embedded SQL connection
│   ├── controllers/                 # Express route controllers
│   ├── middleware/                  # JWT auth, RBAC roles, audit logger, error handler
│   ├── routes/                      # REST API endpoints
│   ├── services/
│   │   ├── eligibilityService.js    # Deterministic rule engine
│   │   ├── aiService.js             # Gemini AI guidance & document extraction
│   │   └── notificationService.js   # Event notifications
│   ├── uploads/                     # Secure document uploads
│   └── server.js                    # Express app initialization
├── database/
│   ├── schema.sql                   # MySQL DDL schema
│   └── seed.sql                     # Verified ST scholarships & demo users
├── .env.example
├── package.json
└── server.ts                        # Server entry point
```

---

## 🗄️ MySQL Database Setup

To run with a live MySQL instance:

1. Create the MySQL database:
   ```sql
   CREATE DATABASE tribal_scholar_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Import schema and seed data:
   ```bash
   mysql -u root -p tribal_scholar_ai < database/schema.sql
   mysql -u root -p tribal_scholar_ai < database/seed.sql
   ```
3. Set your environment variables in `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=tribal_scholar_ai
   JWT_SECRET=tribalscholar_secure_jwt_secret_2026_sih
   GEMINI_API_KEY=your_gemini_api_key
   VAPI_PUBLIC_KEY=your_vapi_public_key
   VAPI_ASSISTANT_ID=your_vapi_assistant_id
   PORT=3000
   ```

*Note: If MySQL is not running locally, the application automatically boots into its embedded persistent SQL engine, running the exact same schema and seed data so all features work continuously.*

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the full-stack server
npm run dev
```

Server will run at `http://localhost:3000`.

---

## 👥 Demo Accounts (Development & SIH Demonstration)

All demo accounts use password: `password123`

| Role | Email | Password | Access / Scope |
|---|---|---|---|
| **ST Student** | `student@example.com` | `password123` | Student Dashboard, Applications, Profile |
| **ST Student (Female)** | `sunita.soren@example.com` | `password123` | STEM Fellowship Applicant |
| **Institute Nodal Officer** | `institute@example.com` | `password123` | Institutional Verification Desk |
| **Welfare Director (Admin)**| `admin@example.com` | `password123` | Admin Command, Scheme CRUD, Analytics |
| **Joint Secretary (Super Admin)**| `superadmin@example.com` | `password123` | Full Administrative Privileges |

*A one-click demo switcher is also available directly in the top navigation bar of every page for fast demonstration during hackathon judging.*
