const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async function (req, res) {
  try {
    const userId = req.user.id;

    // Fetch stats
    const [[{ listingsCount }]] = await db.query(
      "SELECT COUNT(*) AS listingsCount FROM listings WHERE owner_id = ?",
      [userId]
    );

    const [[{ borrowingsCount }]] = await db.query(
      "SELECT COUNT(*) AS borrowingsCount FROM bookings WHERE borrower_id = ?",
      [userId]
    );

    const [[{ lendingsCount }]] = await db.query(
      "SELECT COUNT(*) AS lendingsCount FROM bookings WHERE owner_id = ? AND status IN ('accepted', 'active', 'completed')",
      [userId]
    );

    const [[{ helpCount }]] = await db.query(
      "SELECT COUNT(*) AS helpCount FROM help_requests WHERE requester_id = ?",
      [userId]
    );

    return res.json({
      success: true,
      profile: {
        id: req.user.id,
        fullName: req.user.full_name,
        email: req.user.college_email,
        role: req.user.role,
        phone: req.user.phone,
        department: req.user.department,
        yearOfStudy: req.user.year_of_study,
        bio: req.user.bio,
        avatarUrl: req.user.avatar_url,
        createdAt: req.user.created_at
      },
      stats: {
        listingsCount,
        borrowingsCount,
        lendingsCount,
        helpCount
      }
    });
  } catch (error) {
    console.error("Profile error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load profile." });
  }
});

router.patch("/", requireAuth, async function (req, res) {
  try {
    const { phone, department, yearOfStudy, bio, avatarUrl } = req.body;

    await db.execute(
      `UPDATE users 
       SET phone = COALESCE(?, phone),
           department = COALESCE(?, department),
           year_of_study = COALESCE(?, year_of_study),
           bio = COALESCE(?, bio),
           avatar_url = COALESCE(?, avatar_url)
       WHERE id = ?`,
      [
        phone !== undefined ? String(phone).trim() : null,
        department !== undefined ? String(department).trim() : null,
        yearOfStudy !== undefined ? String(yearOfStudy).trim() : null,
        bio !== undefined ? String(bio).trim() : null,
        avatarUrl !== undefined ? String(avatarUrl).trim() : null,
        req.user.id
      ]
    );

    return res.json({
      success: true,
      message: "Profile updated successfully."
    });
  } catch (error) {
    console.error("Profile update error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

module.exports = router;
