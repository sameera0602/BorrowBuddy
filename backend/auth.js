
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
const sendOTP = require("./mailer");

const router = express.Router();

const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const MAX_OTP_PER_DAY = 5;

// HASH OTP
function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// CREATE JWT
function createToken(payload, expiresIn) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from backend/.env");
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: expiresIn
  });
}

// SET LOGIN COOKIE
function setLoginCookie(res, user) {
  const token = createToken({
    sub: user.id,
    email: user.college_email,
    purpose: "session"
  }, "7d");

  res.cookie("borrowbuddy_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}


// NORMALIZE COLLEGE EMAIL / ROLL NUMBER
function normalizeCollegeEmail(input) {
  let val = String(input || "").trim().toLowerCase();
  val = val.replace(/\s+/g, "");
  if (!val) return "";
  if (val === "sm471" || val === "sm4721") {
    return "sm4721@srmist.edu.in";
  }
  if (!val.includes("@")) {
    return `${val}@srmist.edu.in`;
  }
  return val;
}

// ======================================
// STEP 0: CHECK USER (EXISTS / IS ADMIN)
// ======================================
router.post("/check-user", async function (req, res) {
  try {
    const rawInput = String(req.body.emailOrId || "").trim();
    if (!rawInput) {
      return res.status(400).json({
        success: false,
        message: "Please enter your Student ID or college email."
      });
    }

    const cleanEmail = normalizeCollegeEmail(rawInput);
    const adminEmail = (process.env.ADMIN_EMAIL || "sm4721@srmist.edu.in").toLowerCase();

    // Check if it matches admin roll number or email
    const isExplicitAdmin =
      rawInput.toLowerCase().replace(/\s+/g, "") === "sm4721" ||
      rawInput.toLowerCase().replace(/\s+/g, "") === "sm471" ||
      cleanEmail === adminEmail;

    if (isExplicitAdmin) {
      return res.json({
        success: true,
        exists: true,
        isAdmin: true,
        email: adminEmail,
        fullName: "Sameera (Admin SM 471)"
      });
    }

    if (!/^[^\s@]+@srmist\.edu\.in$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid SRM student roll number (e.g. sm4721) or @srmist.edu.in email."
      });
    }

    const [users] = await db.execute(
      "SELECT id, full_name, college_email, role FROM users WHERE college_email = ? LIMIT 1",
      [cleanEmail]
    );

    if (users.length > 0) {
      const u = users[0];
      return res.json({
        success: true,
        exists: true,
        isAdmin: u.role === "admin" || u.college_email.toLowerCase() === adminEmail,
        email: u.college_email,
        fullName: u.full_name
      });
    }

    return res.json({
      success: true,
      exists: false,
      isAdmin: false,
      email: cleanEmail
    });
  } catch (error) {
    console.error("Check user error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error checking user account."
    });
  }
});

// ======================================
// STEP 0.5: ADMIN QUICK LOGIN (SM 471)
// ======================================
router.post("/admin-quick-login", async function (req, res) {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "sm4721@srmist.edu.in").toLowerCase();

    let [users] = await db.execute(
      "SELECT id, full_name, college_email, role FROM users WHERE college_email = ? OR role = 'admin' LIMIT 1",
      [adminEmail]
    );

    let adminUser;
    if (users.length > 0) {
      adminUser = users[0];
      if (adminUser.role !== "admin") {
        await db.execute("UPDATE users SET role = 'admin' WHERE id = ?", [adminUser.id]);
        adminUser.role = "admin";
      }
    } else {
      const dummyHash = await bcrypt.hash("Admin@123", 10);
      const [insertRes] = await db.execute(
        "INSERT INTO users (full_name, college_email, password_hash, email_verified, role) VALUES ('Sameera', ?, ?, TRUE, 'admin')",
        [adminEmail, dummyHash]
      );
      adminUser = {
        id: insertRes.insertId,
        full_name: "Sameera",
        college_email: adminEmail,
        role: "admin"
      };
    }

    setLoginCookie(res, adminUser);

    return res.json({
      success: true,
      message: "Admin portal access granted for SM 471!",
      user: {
        id: adminUser.id,
        fullName: adminUser.full_name || "Sameera",
        email: adminUser.college_email,
        role: "admin"
      }
    });
  } catch (error) {
    console.error("Admin quick login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not grant admin access: " + error.message
    });
  }
});

// ======================================
// STEP 1: REGISTER - SEND OTP
// ======================================

router.post("/register", async function (req, res) {
  try {
    const fullName = String(req.body.fullName || "").trim();

    const collegeEmail = normalizeCollegeEmail(req.body.collegeEmail || "");

    // VALIDATE NAME
    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid full name."
      });
    }

    // VALIDATE COLLEGE EMAIL
    if (!/^[^\s@]+@srmist\.edu\.in$/.test(collegeEmail)) {
      return res.status(400).json({
        success: false,
        message: "Use a valid @srmist.edu.in email address."
      });
    }

    // CHECK EXISTING USER
    const [users] = await db.execute(
      "SELECT id FROM users WHERE college_email = ?",
      [collegeEmail]
    );

    if (users.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This email already has an account. Please log in."
      });
    }

    // CHECK OTP LIMIT
    const [recentOTPs] = await db.execute(
      `SELECT created_at FROM signup_otps
       WHERE college_email = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY created_at DESC`,
      [collegeEmail]
    );

    if (recentOTPs.length >= MAX_OTP_PER_DAY) {
      return res.status(429).json({
        success: false,
        message: "OTP limit reached. Please try again later."
      });
    }

    // RESEND WAIT
    if (recentOTPs.length > 0) {
      const lastSent = new Date(recentOTPs[0].created_at).getTime();

      const wait =
        RESEND_SECONDS * 1000 - (Date.now() - lastSent);

      if (wait > 0) {
        return res.status(429).json({
          success: false,
          message:
            "Please wait " +
            Math.ceil(wait / 1000) +
            " seconds before requesting another OTP."
        });
      }
    }

    // GENERATE OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    const otpHash = hashOTP(otp);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // DISABLE OLD OTP
    await db.execute(
      `UPDATE signup_otps
       SET consumed = TRUE
       WHERE college_email = ?
       AND purpose = 'signup'
       AND consumed = FALSE`,
      [collegeEmail]
    );

    // SAVE OTP + FULL NAME
    await db.execute(
      `INSERT INTO signup_otps
       (student_number, college_email, full_name, otp_hash, expires_at, purpose)
       VALUES (NULL, ?, ?, ?, ?, 'signup')`,
      [collegeEmail, fullName, otpHash, expiresAt]
    );

    // SEND EMAIL
    try {
      await sendOTP(collegeEmail, otp);
    } catch (emailError) {
      console.error("OTP email error:", emailError.message);

      await db.execute(
        `UPDATE signup_otps
         SET consumed = TRUE
         WHERE college_email = ?
         AND purpose = 'signup'
         AND consumed = FALSE`,
        [collegeEmail]
      );

      return res.status(502).json({
        success: false,
        message: "Could not send the OTP email. Please try again later."
      });
    }

    return res.json({
      success: true,
      message: "OTP sent to your SRM email. It expires in 5 minutes."
    });

  } catch (error) {
    console.error("Register error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
});


// ======================================
// STEP 2: VERIFY OTP
// ======================================

router.post("/verify-otp", async function (req, res) {
  try {
    const collegeEmail = normalizeCollegeEmail(req.body.collegeEmail || "");

    const otp = String(req.body.otp || "").trim();

    if (!/^[^\s@]+@srmist\.edu\.in$/.test(collegeEmail)) {
      return res.status(400).json({
        success: false,
        message: "Use a valid @srmist.edu.in email address."
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Enter the six-digit OTP."
      });
    }

    // FETCH LATEST OTP
    const [rows] = await db.execute(
      `SELECT id, otp_hash, expires_at, failed_attempts
       FROM signup_otps
       WHERE college_email = ?
       AND purpose = 'signup'
       AND consumed = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [collegeEmail]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active OTP found. Please request a new one."
      });
    }

    const record = rows[0];

    // CHECK ATTEMPTS
    if (record.failed_attempts >= MAX_ATTEMPTS) {
      await db.execute(
        "UPDATE signup_otps SET consumed = TRUE WHERE id = ?",
        [record.id]
      );

      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please request a new OTP."
      });
    }

    // CHECK EXPIRY
    if (Date.now() > new Date(record.expires_at).getTime()) {
      await db.execute(
        "UPDATE signup_otps SET consumed = TRUE WHERE id = ?",
        [record.id]
      );

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one."
      });
    }

    // COMPARE OTP
    const submittedHash = hashOTP(otp);

    const correct = crypto.timingSafeEqual(
      Buffer.from(submittedHash, "hex"),
      Buffer.from(record.otp_hash, "hex")
    );

    if (!correct) {
      await db.execute(
        `UPDATE signup_otps
         SET failed_attempts = failed_attempts + 1
         WHERE id = ?`,
        [record.id]
      );

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP. Please try again."
      });
    }

    // MARK VERIFIED
    await db.execute(
      "UPDATE signup_otps SET verified_at = NOW() WHERE id = ?",
      [record.id]
    );

    // TEMPORARY SIGNUP TOKEN
    const signupToken = createToken({
      email: collegeEmail,
      otpId: record.id,
      purpose: "finish-signup"
    }, "10m");

    return res.json({
      success: true,
      signupToken: signupToken,
      message: "Email verified! Now set your password."
    });

  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
});


// ======================================
// STEP 3: CREATE PASSWORD + SAVE USER
// ======================================

router.post("/set-password", async function (req, res) {
  let connection;

  try {
    const signupToken = String(req.body.signupToken || "");
    const password = String(req.body.password || "");

    if (!signupToken) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email first."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must contain 8 to 72 characters."
      });
    }

    // VERIFY SIGNUP TOKEN
    let decoded;

    try {
      decoded = jwt.verify(
        signupToken,
        process.env.JWT_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message:
          "Signup verification expired. Please verify your email again."
      });
    }

    if (
      decoded.purpose !== "finish-signup" ||
      !decoded.otpId ||
      !/^[^\s@]+@srmist\.edu\.in$/.test(decoded.email || "")
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid signup verification. Please start again."
      });
    }

    // HASH PASSWORD
    const passwordHash = await bcrypt.hash(password, 12);

    connection = await db.getConnection();

    await connection.beginTransaction();

    // FETCH VERIFIED OTP INCLUDING FULL NAME
    const [otpRows] = await connection.execute(
      `SELECT id, full_name, verified_at, consumed
       FROM signup_otps
       WHERE id = ?
       AND college_email = ?
       AND purpose = 'signup'
       FOR UPDATE`,
      [decoded.otpId, decoded.email]
    );

    if (
      otpRows.length === 0 ||
      !otpRows[0].verified_at ||
      otpRows[0].consumed
    ) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Verification is no longer valid. Please start again."
      });
    }

    const verifiedAt =
      new Date(otpRows[0].verified_at).getTime();

    if (Date.now() - verifiedAt > 10 * 60 * 1000) {
      await connection.rollback();

      return res.status(401).json({
        success: false,
        message:
          "Signup verification expired. Please verify your email again."
      });
    }

    // CHECK IF ACCOUNT ALREADY EXISTS
    const [existing] = await connection.execute(
      "SELECT id FROM users WHERE college_email = ?",
      [decoded.email]
    );

    if (existing.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          "This email already has an account. Please log in."
      });
    }

    // SAVE USER WITH FULL NAME
    await connection.execute(
      `INSERT INTO users
       (full_name, college_email, password_hash, email_verified, role)
       VALUES (?, ?, ?, TRUE, 'student')`,
      [
        otpRows[0].full_name,
        decoded.email,
        passwordHash
      ]
    );

    // MARK OTP AS USED
    await connection.execute(
      "UPDATE signup_otps SET consumed = TRUE WHERE id = ?",
      [decoded.otpId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message:
        "Account created! You can now log in with your email and password.",
      fullName: otpRows[0].full_name,
      email: decoded.email
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "This email already has an account. Please log in."
      });
    }

    console.error("Set password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not create your account. Please try again."
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});


// ======================================
// STEP 4: LOGIN
// ======================================

router.post("/login", async function (req, res) {
  try {
    const rawInput = String(req.body.collegeEmail || req.body.emailOrId || "").trim();
    const collegeEmail = normalizeCollegeEmail(rawInput);
    const password = String(req.body.password || "");

    if (!collegeEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Student ID/Email and password are required."
      });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "sm4721@srmist.edu.in").toLowerCase();

    // FIND USER
    const [users] = await db.execute(
      `SELECT id, full_name, college_email, password_hash, email_verified, role
       FROM users
       WHERE college_email = ?
       LIMIT 1`,
      [collegeEmail]
    );

    if (
      users.length === 0 ||
      !users[0].password_hash ||
      !users[0].email_verified
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid student ID/email or password."
      });
    }

    const user = users[0];

    // Check admin quick password bypass or regular bcrypt
    const isAdminUser = user.role === "admin" || user.college_email.toLowerCase() === adminEmail;
    let passwordMatches = false;

    if (isAdminUser && (password === "admin" || password === "sm4721" || password === "Sameera06" || password === "Admin@123")) {
      passwordMatches = true;
    } else {
      passwordMatches = await bcrypt.compare(password, user.password_hash);
    }

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid student ID/email or password."
      });
    }

    const effectiveRole = isAdminUser ? "admin" : "student";
    setLoginCookie(res, { ...user, role: effectiveRole });

    return res.json({
      success: true,
      message: effectiveRole === "admin" ? "Admin portal login successful!" : "Login successful!",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.college_email,
        role: effectiveRole
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
});


// ======================================
// STEP 5: LOGOUT
// ======================================

router.post("/logout", function (req, res) {
  res.clearCookie("borrowbuddy_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  return res.json({
    success: true,
    message: "Logged out successfully."
  });
});

// ======================================
// STEP 6: CURRENT USER / SESSION CHECK
// ======================================

router.get("/me", async function (req, res) {
  try {
    let token = null;

    if (req.cookies && req.cookies.borrowbuddy_token) {
      token = req.cookies.borrowbuddy_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No active session."
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Session expired."
      });
    }

    if (decoded.purpose !== "session" || !decoded.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid session."
      });
    }

    const [users] = await db.execute(
      `SELECT id, full_name, college_email, role, phone, department, year_of_study, bio, avatar_url, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.sub]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found."
      });
    }

    const user = users[0];
    const adminEmail = (process.env.ADMIN_EMAIL || "sm4721@srmist.edu.in").toLowerCase();
    const effectiveRole = (user.role === "admin" || user.college_email.toLowerCase() === adminEmail) ? "admin" : "student";

    return res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.college_email,
        role: effectiveRole,
        phone: user.phone,
        department: user.department,
        yearOfStudy: user.year_of_study,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error("Auth /me error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
});

module.exports = router;
