const jwt = require("jsonwebtoken");
const db = require("../db");

async function requireAuth(req, res, next) {
  try {
    let token = null;

    // Check cookie first
    if (req.cookies && req.cookies.borrowbuddy_token) {
      token = req.cookies.borrowbuddy_token;
    }
    // Check Authorization header fallback
    else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in."
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing in server environment.");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please log in again."
      });
    }

    if (decoded.purpose !== "session" || !decoded.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid session token."
      });
    }

    const [rows] = await db.execute(
      `SELECT id, college_email, full_name, role, phone, department, year_of_study, bio, avatar_url, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.sub]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists."
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication."
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  // Double check admin role or explicit admin roll number / email configured in env
  const adminEmail = (process.env.ADMIN_EMAIL || "sm4721@srmist.edu.in").toLowerCase();
  const isAdmin = req.user.role === "admin" || req.user.college_email.toLowerCase() === adminEmail;

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only authorized administrators (SM 471) can perform this action."
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
