# LandAI – AI-Powered Land Record Digitization & Property Recommendation

A complete, production-ready web platform for digitizing land records, validating title documents, and matching properties based on buyer and seller criteria.

---

## 🌟 Key Features

1. **Native Secure Authentication**
   - Pure JWT-based authentication using **bcrypt** password hashing and **SQLite**.
   - No external identity providers, no third-party tracking, and zero email-verification blockers.
   - Dual-token delivery: Secure `HttpOnly` cookie for persistent sessions + in-memory Bearer token for API operations.
   - Role-based access control for **Buyers** and **Sellers**.

2. **AI-Powered Land Document Digitization (OCR)**
   - Microservice powered by Python, FastAPI, PyTesseract, and OpenCV.
   - Multilingual support (Tamil, English, and bilingual legal records).
   - Structured entity extraction: Survey numbers, Patta numbers, registration details, extent, boundary descriptors, and ownership history.

3. **Rule-Based Legal & Structural Validation**
   - Validates document completeness against Tamil Nadu / Indian land record standards.
   - Performs sanity checks on survey formats, date consistency, and missing mandatory clauses without claiming false legal authority.
   - Generates downloadable textual validation reports.

4. **Property Discovery & Recommendation Engine**
   - Catalog of verified agricultural, commercial, and residential plots.
   - Preference-aware matching tailored to user budget, minimum area, and preferred district.
   - Direct seller inquiry and bookmarking system.

---

## 🏗️ Architecture

```
build/
├── OCR/                   # Python FastAPI OCR & Document AI service (Port 8000)
│   ├── app/               # FastAPI application & extraction logic
│   └── requirements.txt   # Python dependencies (tesseract, opencv, fastapi)
├── server/                # Node.js Express Backend & SQLite CRM (Port 5000)
│   ├── app.js             # Express application & route wiring
│   ├── db.js              # SQLite database schema & connection (better-sqlite3)
│   ├── middleware/        # JWT authentication & role authorization
│   ├── routes/            # /auth, /properties, /documents endpoints
│   └── services/          # OCR client proxy & land record validation
├── src/                   # React 19 + TypeScript + Tailwind CSS Frontend (Port 8443)
│   ├── components/        # UI components & application shell
│   ├── context/           # AuthContext managing native JWT auth state
│   ├── pages/             # Landing, Dashboard, Documents, Properties, Profile
│   └── services/          # Frontend API client
└── vite.config.ts         # Vite configuration with embedded dev API middleware
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 20.18
- **Python** >= 3.10 (for the OCR service)
- **Tesseract OCR** (optional for test runs; required for active local OCR processing)

### Installation

1. **Install Frontend & Backend Node Dependencies:**
   ```bash
   npm install
   ```

2. **Install Python OCR Dependencies (optional if running Document AI service):**
   ```bash
   pip install -r OCR/requirements.txt
   ```

---

## 💻 Running the Application

### Option A: Run All Services Concurrently
```bash
npm run start
```
Starts:
- Vite Frontend Dev Server (`http://localhost:8443`)
- Node.js API Backend (`http://localhost:5000`)
- Python OCR FastAPI Service (`http://localhost:8000`)

### Option B: Run Services Individually
- **Frontend (Vite):**
  ```bash
  npm run dev
  ```
- **Backend (Node.js):**
  ```bash
  npm run server
  ```
- **Document AI (FastAPI):**
  ```bash
  npm run ocr
  ```

---

## 🧪 Production Build & Verification

To verify TypeScript and compile the client bundle:
```bash
npm run build
```
Preview the built assets:
```bash
npm run preview
```

## Document verification setup

The verification workflow uses the FastAPI OCR service. It accepts PDF, JPG,
JPEG, and PNG files up to 50 MB, uses embedded PDF text when available, and
falls back to Tesseract for scanned pages. The service automatically detects a
standard Windows installation at `C:\Program Files\Tesseract-OCR\tesseract.exe`
or `C:\Program Files (x86)\Tesseract-OCR\tesseract.exe`. This project includes
the English and Tamil language data (`eng` and `tam`) in `OCR/data/tessdata`.
Set `TESSERACT_CMD` only if your executable is installed elsewhere.
`TESSDATA_DIR` and `LANDAI_OCR_PSM` are also available for OCR configuration.

Document processing reports OCR confidence, missing fields, formatting checks,
and differences between a user's own documents. These are review aids and do
not claim legal ownership, authenticity, fraud-free status, or official
registry verification.

Authentication stores bcrypt password hashes in SQLite and uses JWTs with an
HttpOnly cookie. In development, the password-reset endpoint returns a
one-time reset token because no email provider is configured. Production
deployments should connect that flow to a transactional email provider and set
a strong `JWT_SECRET`.
