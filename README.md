# BorrowBuddy — SRMIST Tiruchirappalli Student Marketplace

**BorrowBuddy** is a full-stack campus sharing and academic support web application built exclusively for students of SRM Institute of Science and Technology, Tiruchirappalli.

---

## 🌟 Key Features

1. **SRMIST Student Authentication (Preserved)**
   - OTP verification via official `@srmist.edu.in` email.
   - Secure bcrypt password hashing and 7-day JWT session cookie (`borrowbuddy_token`).
   - Persistent sessions across browser refreshes via `/api/auth/me`.

2. **Borrow — Marketplace**
   - Browse approved items posted by fellow SRM students.
   - Filter by categories (*Books & Notes, Electronics, Lab Equipment, Calculators, Sports, Clothing, Event Supplies, Other*), condition, price, and search keywords.
   - View uploaded photos, owner details, deposit requirements, and campus pickup locations.
   - Request to borrow for specific dates with automated price calculation and conflict prevention.

3. **Share — Create a Listing**
   - Students list items for rent with multi-image photo uploads (up to 5 images, max 5MB each).
   - Form includes title, category, description, condition, daily rental price in INR, deposit, pickup location, and rules.
   - Listings enter `pending` status awaiting admin moderation.

4. **Admin Review & Moderation (Roll No: SM 471)**
   - Server-side enforcement of admin identity (`sm4721@srmist.edu.in` / Roll No: `SM 471`).
   - Admin moderation console: inspect uploaded photos, approve or reject listings with reasons.
   - Suspend inappropriate listings, review student safety reports, and inspect audit logs.
   - Only approved listings are shown in the public marketplace.

5. **Borrowing & Booking Workflow**
   - Double-booking prevention: database transaction locking prevents overlapping confirmed bookings for the same item.
   - Booking statuses: `pending` → `accepted` / `declined` → `active` → `completed`.
   - Accepting a booking automatically establishes a private booking chat between borrower and owner.
   - Return workflow marks the item completed and frees it for future bookings.

6. **Private Persistent Chats**
   - Real-time polling messaging between borrower and lender, or student and academic helper.
   - Stored in MySQL with timestamps, participant validation, and report option.

7. **Help a Buddy — Academic Support Marketplace**
   - Peer academic collaboration: *Docs & Formatting, Slides & Design, Proofread & Polish, Study Together, Peer Tutoring, Project Support*.
   - Academic integrity policy: strictly legitimate tutoring, styling, and collaboration (prohibiting exam cheating or ghostwriting).
   - Students submit help offers with custom quotes; accepting an offer opens a private chat.

8. **PWA Mobile-Ready & Figma-Inspired Design**
   - Palette: Warm cream background (`#FBF9F4`), deep campus navy blue (`#132238`), amber yellow accents (`#F59E0B`), and coral action accents (`#F43F5E`).
   - Mobile PWA experience with bottom navigation bar and installable Web App Manifest (`manifest.webmanifest`).

---

## 🚀 Quick Start Guide

### 1. Database Setup & Migration
Ensure MySQL is running, then run the migration script to create all marketplace tables and configure the admin account:

```bash
cd backend
node migrate.js
```

This verifies and creates the following MySQL tables:
- `users`
- `signup_otps`
- `listings`
- `listing_images`
- `bookings`
- `conversations`
- `messages`
- `help_requests`
- `help_offers`
- `reports`
- `moderation_audit_logs`

### 2. Running the Backend
From the `backend` directory:
```bash
cd backend
node server.js
```
The server will start on port `5000`:
- Base URL: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`
- Uploaded images: `http://localhost:5000/uploads/<filename>`

### 3. Running the Frontend
From the `frontend` directory:
```bash
cd frontend
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🔒 Configuration & Admin Identity

### Authorized Admin (Roll Number SM 471)
The admin identity is assigned to `sm4721@srmist.edu.in` (Roll No: SM 471).
This identity is enforced strictly on the server:
- `backend/.env`:
  ```env
  ADMIN_EMAIL=sm4721@srmist.edu.in
  ADMIN_ROLL_NUMBER=SM 471
  ```
- Normal users registering through the frontend are always assigned `role = 'student'`. Ordinary users cannot escalate their privileges.

### Image Storage Setup
Item photos are processed by `multer` and saved persistently to `backend/uploads/`.
- File validation restricts uploads to JPEG, PNG, and WEBP formats, max 5MB each.
- Served statically from Express at `http://localhost:5000/uploads/...`.
- If you wish to use Cloudinary in production, simply swap the multer disk storage in `backend/middleware/upload.js` with Cloudinary storage using your API credentials.

---

## 🧪 Automated Test Suite
To run the automated verification suite covering all 21 core workflows:
```bash
cd backend
node test-suite.js
```
All 21 tests pass:
- Health check and authentication protection
- Admin (SM 471) role verification and student access control
- Real image upload and listing submission (status: pending)
- Public marketplace filter (pending items hidden until approved)
- Admin review and one-click approval
- Booking request and owner acceptance
- Double-booking conflict rejection (409 Conflict)
- Private booking chat creation and messaging
- Help a Buddy request, helper quote, and offer acceptance
- Return workflow and item completion
