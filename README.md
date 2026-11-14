# BorrowBuddy — SRMIST Tiruchirappalli Student Marketplace & PWA

**BorrowBuddy** is a full-stack campus sharing and academic support web application built exclusively for students of **SRM Institute of Science and Technology, Tiruchirappalli**. It allows students to borrow/lend items, request academic peer help, chat privately, and install the platform directly onto their phones and laptops as a Progressive Web App (PWA).

---

## 📱 Progressive Web App (PWA) Features

BorrowBuddy is certified and optimized as an installable Progressive Web App:
- **Standalone App Experience:** Runs in full-screen standalone mode without browser URL bars, feeling identical to a native mobile app.
- **Service Worker & Caching (`vite-plugin-pwa` + Workbox):** Automatically precaches static assets (HTML, CSS, JS, Google Fonts, SVGs) for instant load times and offline readiness.
- **Custom App Icons:** Includes 192x192, 512x512, maskable 512x512, and 180x180 Apple Touch Icons with SRMIST campus branding.
- **Smart Install Prompt:** Built-in floating install prompt and step-by-step guides for iOS Safari (*Add to Home Screen*) and Android/Chrome (*Install App*).

### How to Install:
- **Android (Chrome):** Open the app, tap the top-right three dots (**⋮**), and select **"Install app"** or tap the in-app install banner.
- **iPhone / iPad (Safari):** Open the link in Safari, tap the **Share** button ($\boxuparrow$), scroll down, and tap **"Add to Home Screen"** ($\boxplus$).
- **Windows / Mac (Chrome / Edge):** Click the install icon in the address bar or tap **Install** from the in-app banner.

---

## 🌟 Key Features

1. **Strict SRMIST College Email Authentication**
   - **Email Requirement:** Students must sign in using their official college email (`eg. sm4557@srmist.edu.in`). Register numbers and personal emails are strictly rejected.
   - **Real OTP Verification:** Automated OTP delivery via SMTP to the student's `@srmist.edu.in` inbox.
   - **Password Security:** Salted bcrypt password hashing with 7-day JWT session handling (supporting cross-site cookies and `Authorization: Bearer` fallback).

2. **Admin Moderation & Identity (SM 471)**
   - Authorized admin identity is tied to roll number **SM 471** (`sm4721@srmist.edu.in`).
   - Entering `SM4721` or `sm4721@srmist.edu.in` prompts for the admin password; once verified, the user is redirected straight to the **Admin Portal**.
   - Admin Console capabilities:
     - Review pending listings with photos, descriptions, and rental pricing.
     - One-click Approve or Reject with reason.
     - Suspend inappropriate listings.
     - Review student safety reports and track moderation audit logs.

3. **Borrow — Campus Marketplace**
   - Browse approved items posted by fellow SRM students (*Books & Notes, Electronics, Lab Equipment, Calculators, Sports, Clothing, Event Supplies, Other*).
   - Filter by category, condition, and price. Search by keyword.
   - View high-resolution photos, deposit requirements, and campus pickup locations.
   - Request to borrow for specific dates with automatic price calculation and conflict prevention.

4. **Share — Create a Listing**
   - Upload up to 5 actual photos with client-side preview and size validation.
   - Set rental charges per day in INR, security deposit, and pickup location on campus.
   - Listings enter `pending` status awaiting admin moderation before being visible to other students.

5. **Borrowing & Double-Booking Prevention**
   - Database transactions and state machines prevent overlapping bookings for the same item.
   - Status tracking: `pending` $\rightarrow$ `accepted` / `declined` $\rightarrow$ `active` $\rightarrow$ `completed`.
   - Accepting a reservation automatically opens a private chat between borrower and owner.

6. **Private Persistent Messaging**
   - Booking-linked and help-linked chats stored in MySQL with sender, timestamp, and read tracking.
   - Monitored safety controls: students can flag inappropriate conversations to the admin.

7. **Help a Buddy — Peer Academic Support**
   - Peer academic collaboration: *Docs & Formatting, Slides & Design, Proofreading, Study Together, Peer Tutoring, Project Support*.
   - Strict academic integrity policy: legitimate tutoring and styling support only (exam cheating or ghostwriting is prohibited).

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite 8, `vite-plugin-pwa` (Workbox), Lucide Icons.
- **Backend:** Node.js, Express 5, `cookie-parser`, `cors`, `multer`, `nodemailer`, `jsonwebtoken`, `bcryptjs`.
- **Database:** MySQL 8 / TiDB Cloud (with `mysql2/promise` and SSL support).
- **Design System:** Campus Warm Theme — Cream background (`#FBF9F4`), Deep Navy (`#132238`), Amber Gold (`#FFB800`), Coral Accent (`#FF6B6B`).

---

## 🚀 Running the Project Locally

### 1. Database Setup
Ensure MySQL is running locally, then initialize the database tables:
```bash
cd backend
node migrate.js
```

### 2. Start the Backend Server
```bash
cd backend
node server.js
```
The server starts on port `5000` (serves both the REST API and the compiled PWA frontend).

### 3. Start the Frontend (Development Mode)
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build Frontend for PWA Production
```bash
cd frontend
npm run build
```
This generates the PWA service worker (`sw.js`), manifest, and bundles into `frontend/dist`.

---

## ☁️ Deployment Guide

### Option 1: Instant Free Public Tunnel (Cloudflare Tunnel)
Expose your local BorrowBuddy instance with a live HTTPS PWA URL without paying or setting up cloud databases:
```powershell
.\cloudflared.exe tunnel --url http://localhost:5000 --edge-ip-version 4
```

### Option 2: Cloud Deployment (Vercel + Render)
1. **Frontend (Vercel Hobby — 100% Free):**
   - Import `sameera0602/BorrowBuddy` on [Vercel](https://vercel.com).
   - Set **Root Directory** to `frontend`.
   - Add environment variable: `VITE_API_URL = https://your-backend.onrender.com`.
   - `frontend/vercel.json` automatically handles SPA routing and PWA headers.
2. **Backend (Render Free Web Service):**
   - Import `sameera0602/BorrowBuddy` on [Render](https://render.com).
   - Set **Root Directory** to `backend`, Build Command to `npm install`, Start Command to `npm start`.
   - Choose **Free ($0/mo)** plan.
   - Configure environment variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`).
   - `render.yaml` blueprint is provided in the repository.
3. **Database (Free Cloud MySQL):**
   - Use [TiDB Cloud](https://tidbcloud.com) (Serverless MySQL, 5GB free forever, no credit card required).

---

## 🔒 Environment Variables (`backend/.env`)

```env
PORT=5000
NODE_ENV=production

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=borrowbuddy
DB_SSL=false

# College Restriction
COLLEGE_EMAIL_DOMAIN=srmist.edu.in

# Authorized Admin Identity
ADMIN_ROLL_NUMBER=SM 471
ADMIN_EMAIL=sm4721@srmist.edu.in

# JWT Secrets
JWT_SECRET=your_jwt_secret_key
OTP_SECRET=your_otp_secret_key

# Email Service (for OTPs)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_digit_app_password
```

---

## 🧪 Verification & Tests
To execute the automated backend test suite covering all 21 core workflows:
```bash
cd backend
node test-suite.js
```
Includes tests for student authentication, admin privilege enforcement, image uploads, double-booking prevention, private messaging, and return completion.
