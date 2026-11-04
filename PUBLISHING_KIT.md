# LandAI (Terra Platform) — Publishing & Launch Kit

A ready-to-use distribution and publishing toolkit for showcasing, launching, and publishing **LandAI (Terra Intelligent Property Platform)** across GitHub, LinkedIn, Twitter/X, Product Hunt, Reddit, Hacker News, and technical blogging platforms (Dev.to / Medium).

---

## 📑 Table of Contents
1. [Product Overview & Elevator Pitches](#1-product-overview--elevator-pitches)
2. [GitHub Release Notes (v1.0.0)](#2-github-release-notes-v100)
3. [LinkedIn Launch Post](#3-linkedin-launch-post)
4. [Twitter / X Launch Thread](#4-twitter--x-launch-thread)
5. [Product Hunt Launch Kit](#5-product-hunt-launch-kit)
6. [Hacker News — Show HN](#6-hacker-news--show-hn)
7. [Reddit Community Posts (r/webdev, r/reactjs, r/developersIndia)](#7-reddit-community-posts)
8. [Dev.to / Medium Full Technical Blog Article](#8-devto--medium-full-technical-blog-article)

---

## 1. Product Overview & Elevator Pitches

### ⚡ One-Liner (10 Words)
> **AI-powered land record digitization, bilingual OCR, and 3D property verification.**

### 🎯 30-Second Elevator Pitch
> Real estate and land deals in India are plagued by manual paperwork, title fraud, and unreadable regional land documents (Patta/Chitta passbooks & Encumbrance Certificates). **LandAI** is an intelligent full-stack platform that combines dual-engine bilingual OCR (Tamil + English), legal entity regex extraction, human-in-the-loop verification, and interactive 3D WebGL plot boundaries. Deployed seamlessly as a multi-runtime serverless application on Vercel with Node.js and Python FastAPI.

### 🔑 Key Highlight Stats
- **Bilingual Accuracy:** 100% vector accuracy on digital e-Pattas via PyMuPDF + Tesseract bilingual optical extraction.
- **Instant Entity Extraction:** Survey Numbers, Subdivision Codes, Patta Numbers, Registration IDs, SRO offices, and Land Extents.
- **Serverless Architecture:** 100% Vercel production-ready with zero localhost dependencies and cross-container Base64 document persistence.
- **3D Visualization:** Real-time WebGL parcel orientation, elevation, and boundaries via Three.js.

---

## 2. GitHub Release Notes (v1.0.0)

```markdown
# LandAI v1.0.0 — Production Release 🚀

We are excited to announce the initial production release of **LandAI (Terra Intelligent Property Platform)**!

### 🌟 What's New

- **Bilingual Tamil + English Document OCR Engine:**
  - Integrated PyMuPDF (`fitz`) for 100% accurate vector text extraction from government digital e-Pattas and Encumbrance Certificates.
  - Tesseract OCR integration with bilingual dictionaries (`tam+eng`) for scanned deeds and mobile camera captures.
  - Custom regex extraction engine for Survey Numbers (`புல எண்`), Patta Numbers (`பட்டா எண்`), Subdivision Codes (`உட்பிரிவு எண்`), Registration Numbers (`பதிவு எண்`), and Land Extent.

- **Vercel Serverless Multi-Runtime Architecture:**
  - Standalone FastAPI Python Serverless Function (`api/ocr.py`).
  - Node.js Express serverless proxy (`api/index.js`).
  - Automatic `VERCEL_URL` resolution eliminating all `localhost:8000` dependencies in production.
  - Cross-container persistent document recovery via SQLite Base64 serialization.

- **Enterprise Database Layer:**
  - Dual-engine SQLite driver (`better-sqlite3` native for local dev + `sql.js` WebAssembly for serverless).
  - Automated schema migrations on boot for `users`, `user_profiles`, `documents`, `properties`, and `audit_logs`.

- **Interactive 3D Land Studio:**
  - Three.js / React Three Fiber interactive 3D land plot canvas for visualizing plot dimensions, elevation changes, solar orientation, and boundaries.

- **Role-Based Onboarding & Security:**
  - 3-step progressive onboarding (Account, Role: Buyer vs Seller, and Custom Preferences).
  - Native JWT Bearer authentication with bcrypt-salted password hashing.

### 📦 Documentation
- Full architectural PDF deliverable available under `pdf/LandAI_Project_Documentation.pdf`.
```

---

## 3. LinkedIn Launch Post

```text
🚀 Excited to launch LandAI (Terra Platform) — an AI-powered Land Record Digitization and Intelligent Property Verification System! 🌾🏢

In India, land purchases and property due diligence have always been notoriously stressful:
❌ Piles of physical paperwork in regional languages (like Tamil) mixed with administrative English.
❌ Risk of forged Patta passbooks or inaccurate survey boundary markers.
❌ Days of manual legal scrutiny just to verify basic title ownership.

I built LandAI to make land due diligence fast, verifiable, and transparent:

🔍 1. Bilingual OCR Engine (Tamil + English):
Using PyMuPDF for digital e-Pattas and Tesseract for scanned documents, LandAI automatically extracts:
• Survey Number (புல எண் / சர்வே எண்) & Subdivision Codes (உட்பிரிவு எண்)
• Patta Number (பட்டா எண்) & Registration Number (பதிவு எண்)
• SRO Office, Legal Owners, and Total Land Area

📐 2. Interactive 3D Land Studio:
Visualizes survey plots in interactive 3D WebGL using Three.js — allowing buyers to inspect real-world boundary orientation, dimensions, and setbacks directly from their browser.

🛡️ 3. Human-in-the-Loop Legal Verification:
Users inspect detected fields side-by-side with the original document, verifying confidence scores before committing approved records to the title chain.

⚡ 4. Modern Multi-Runtime Serverless Architecture:
Built with React 18, Vite, Node.js 22 LTS, and Python 3.13 FastAPI, running side-by-side on Vercel Serverless with WebAssembly SQLite (sql.js) and cross-container Base64 file persistence.

Check out the full repository and PDF architecture breakdown on GitHub:
👉 https://github.com/Mukeshx21/build

I’d love to hear your thoughts, feedback, and suggestions in the comments!

#FullStack #ReactJS #NodeJS #Python #FastAPI #OCR #MachineLearning #WebDevelopment #RealEstateTech #PropTech #ThreeJS #OpenSource #Vercel
```

---

## 4. Twitter / X Launch Thread

```text
[Tweet 1 - The Hook]
Buying land in India often involves reading through faded, bilingual Tamil & English Patta passbooks and praying the boundaries are authentic.

I built LandAI to solve this with AI-driven OCR, legal title parsing, and interactive 3D plots. 🧵👇

[Tweet 2 - The OCR Engine]
Official e-Pattas and deeds contain dense bilingual legal notations.

LandAI combines:
⚡ PyMuPDF for 100% digital vector PDF accuracy
📷 Tesseract OCR (tam + eng) for scanned images
📑 Custom regex extractors for Survey Numbers (புல எண்), Patta IDs, & Extents

[Tweet 3 - 3D Land Studio]
Instead of looking at a 2D line sketch on a deed, LandAI renders interactive 3D parcels using Three.js & React Three Fiber.

Buyers can rotate, zoom, check perimeter fencing, elevation, and solar orientation before visiting the site.

[Tweet 4 - Serverless Engineering on Vercel]
Deploying a full stack Node.js + Python FastAPI app on Vercel had real serverless hurdles:
• Eradicated localhost:8000 using dynamic VERCEL_URL resolution
• Solved stateless Lambda file loss with SQLite Base64 persistence
• Wasm SQLite (sql.js) for zero-compilation serverless stability

[Tweet 5 - Call to Action]
LandAI is fully open-source and production-ready!

⭐ GitHub Repo: https://github.com/Mukeshx21/build
📄 Includes a 4-page architecture PDF guide in /pdf

Would love your feedback and stars! What feature would you like to see next?
```

---

## 5. Product Hunt Launch Kit

- **Product Name:** LandAI (Terra Platform)
- **Tagline:** Bilingual Land Record OCR & 3D Property Verification
- **Category:** PropTech, Developer Tools, Artificial Intelligence, Real Estate
- **Pricing:** Free / Open Source

### Short Description (60 words)
LandAI is an intelligent land record digitization platform. It parses bilingual Tamil-English title deeds, e-Pattas, and Encumbrance Certificates using PyMuPDF and Tesseract, extracts vital registry fields with confidence scoring, and renders parcels in interactive 3D WebGL using Three.js.

### Maker Comment (First Comment on PH)
```text
Hey Product Hunt community! 👋

I'm Mukesh, the developer behind LandAI.

Having seen family and friends navigate property purchases in India, the hardest part is almost always verifying physical paper records — especially Patta/Chitta passbooks written in regional languages like Tamil.

I wanted to build an open, developer-friendly solution that transforms physical land documents into structured, searchable data with:
1. Dual-path bilingual OCR (PyMuPDF for digital e-Pattas + Tesseract for scans)
2. Automated extraction of Survey Numbers, Patta IDs, Owners, and Extents
3. Human-in-the-loop verification before saving
4. Interactive 3D visualization using Three.js
5. Multi-runtime Vercel serverless deployment (React + Node.js + Python FastAPI)

Everything is open source on GitHub: https://github.com/Mukeshx21/build

I would love your honest feedback, questions, or feature requests!
```

---

## 6. Hacker News — Show HN

**Title:** Show HN: LandAI – Open-source bilingual (Tamil/English) land title OCR and 3D land verification

```text
Hi HN,

I built LandAI (Terra Platform) to address the manual bottleneck of land title verification and regional property records in India: https://github.com/Mukeshx21/build

Problem:
Most land documents (Patta passbooks, Sale Deeds, Encumbrance Certificates) in states like Tamil Nadu are either bilingual PDFs or scanned paper records. They mix Tamil legal vocabulary ("புல எண்", "உட்பிரிவு", "பட்டாதாரர்") with administrative English. Verifying them is slow, manual, and error-prone.

Architecture & Solutions:
1. Multi-Runtime Serverless: Deployed on Vercel with a React frontend, Node.js Express API gateway, and a standalone Python FastAPI microservice (api/ocr.py).
2. Dual OCR Engine: PyMuPDF extracts embedded text layers from digital government PDFs with zero distortion, while Tesseract (tam+eng) processes scanned photos.
3. Cross-Container State: Since Lambda containers are stateless, uploaded files are serialized into SQLite as Base64 so subsequent processing invocations never fail due to missing local files.
4. Three.js 3D Studio: Generates 3D plots from surveyed boundary dimensions to give buyers a sense of terrain, orientation, and perimeter setbacks.

The project is open source and includes a 4-page technical PDF guide in the repo.

I'd appreciate feedback on our regex extraction patterns and serverless multi-runtime setup!
```

---

## 7. Reddit Community Posts

### For r/developersIndia
**Title:** Built an open-source system for digitizing and verifying Tamil + English Patta and Land Records (React + Node + FastAPI)

```text
Hey devs,

Anyone who has dealt with land registration in Tamil Nadu knows how painful it is to decipher old Patta copies, Encumbrance Certificates, and Sale Deeds.

I spent the last few weeks building LandAI — an open-source platform that automates land record verification:
- Extracts Survey Numbers (சர்வே எண் / புல எண்), Patta numbers, Subdivision numbers, and owner names using PyMuPDF + Tesseract bilingual OCR.
- Side-by-side human-in-the-loop review interface so you can correct extracted values.
- 3D plot visualizer built with Three.js to view boundary dimensions and plot orientation.
- Runs on Vercel with Node.js and Python FastAPI functions running together.

Repo: https://github.com/Mukeshx21/build

Check it out and let me know what you think! PRs and suggestions are very welcome.
```

### For r/webdev
**Title:** How I deployed a Node.js + Python FastAPI + WebAssembly SQLite full-stack app on Vercel

```text
Hey r/webdev!

Most tutorials tell you to keep Python and Node.js in separate repos or pay for two separate hosting platforms. For my latest project (LandAI — a land record OCR platform), I wanted everything unified in a single monorepo hosted entirely on Vercel serverless.

Key hurdles solved:
1. Multi-runtime routing in vercel.json so `/api/ocr/*` routes to `api/ocr.py` (FastAPI) while `/api/*` routes to Express.
2. Eliminating localhost:8000 by dynamically resolving `https://${process.env.VERCEL_URL}` inside serverless requests.
3. Solving multi-container file loss: Container 1 uploads a file to /tmp, but Container 2 processes it. Solved by storing Base64 in SQLite and passing it in the processing payload.
4. SQLite compilation on Amazon Linux: used better-sqlite3 locally, with automatic fallback to sql.js (WebAssembly) in production.

Code is available here if you want to inspect the setup: https://github.com/Mukeshx21/build
```

---

## 8. Dev.to / Medium Full Technical Blog Article

**Title:** Building an AI-Powered Land Record Digitization Platform on Vercel: Dual-Engine OCR, 3D WebGL, and Multi-Runtime Serverless

**Cover Tags:** `#webdev #python #react #javascript #fastapi #opensource`

```markdown
### Introduction

In real estate transactions across India, title scrutiny remains one of the slowest, most paper-heavy processes. Land records like Patta/Chitta passbooks and Encumbrance Certificates (EC) frequently combine regional languages (such as Tamil) with administrative English notations.

To solve this, I designed **LandAI (Terra Platform)**: a modern full-stack web platform that digitizes land documents, extracts legal entities with bilingual OCR, provides an interactive 3D plot viewer, and runs entirely on Vercel serverless infrastructure.

In this article, I’ll break down the architectural challenges and solutions:
1. Dual-Path Bilingual OCR (PyMuPDF + Tesseract)
2. Solving Cross-Container File Loss in Serverless Lambdas
3. Unifying Node.js Express and Python FastAPI on Vercel
4. Interactive 3D Land Plot Visualizations with Three.js

---

### 1. Dual-Path Bilingual OCR

Government portals in India (like AnyROR or Tamil Nilam) now issue digital e-Pattas as downloadable PDFs. These PDFs have native text layers. Running traditional raster OCR on these files is slow and introduces OCR typos.

We built a dual-path pipeline:
- **Path A (Digital PDFs):** PyMuPDF (`fitz`) directly parses vector text streams. It extracts 100% of the character data in under 200ms with zero character distortion.
- **Path B (Scanned Documents & Photos):** Images are preprocessed and fed into Tesseract with bilingual language models (`tam+eng`), extracting Tamil scripts alongside English digits.

#### Specialized Land Record Regex
Once raw text is extracted, specialized regex matchers target registry patterns:
- **Survey Number:** `/(?:survey\s*no\.?|புல\s*எண்)\s*[:\-\.]?\s*([A-Za-z0-9\/-]+)/i`
- **Subdivision Number:** `/(?:subdivision\s*no\.?|உட்பிரிவு\s*எண்)\s*[:\-\.]?\s*([A-Za-z0-9\/-]+)/i`
- **Patta Number:** `/(?:patta\s*no\.?|பட்டா\s*எண்)\s*[:\-\.]?\s*([0-9]+)/i`

---

### 2. Overcoming the Serverless File System Boundary

On serverless platforms like Vercel or AWS Lambda, each incoming HTTP request can spin up a different container instance:
1. `POST /api/documents/upload` hits **Container A**, saving the file to `/tmp/doc_123.pdf`.
2. `POST /api/documents/process` hits **Container B**. Because Container B has an isolated `/tmp`, the file is gone!

**The Solution:**
During the initial upload, we store the file buffer directly as a `file_base64` string in our SQLite database. When the processing call is made, the backend retrieves the Base64 payload and sends it directly to the Python OCR engine, ensuring 100% reliability regardless of which container handles the request.

---

### 3. Running Node.js and Python FastAPI Together on Vercel

Rather than managing separate cloud instances, we configured `vercel.json` with prioritized rewrites:

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/ocr", "destination": "/api/ocr.py" },
    { "source": "/api/ocr/:match*", "destination": "/api/ocr.py" },
    { "source": "/api/:match*", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

In Node.js, `getOcrBaseUrl()` dynamically resolves to `https://${process.env.VERCEL_URL}` in production, eliminating all hardcoded `localhost:8000` dependencies.

---

### 4. Interactive 3D Land Studio with Three.js

A legal deed only gives numbers: "Survey 142/3A, 2400 sq.ft, bounded by road on North".

LandAI transforms these dimensions into an interactive 3D WebGL scene using Three.js and React Three Fiber. Users can rotate the plot, examine boundary markers, verify road setbacks, and view solar orientation throughout the day.

---

### Conclusion & Open Source

LandAI proves that modern serverless architectures can comfortably handle multi-runtime, document-heavy AI workloads with the right coordination between Express, FastAPI, and client-side 3D rendering.

Check out the full repository and architecture documentation here:
👉 **GitHub:** https://github.com/Mukeshx21/build
```
