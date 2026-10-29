const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, async function (req, res) {
  try {
    const { targetType, targetId, reason, details } = req.body;

    const validTypes = ["listing", "conversation", "user", "help_request"];
    if (!validTypes.includes(targetType)) {
      return res.status(400).json({ success: false, message: "Invalid report target." });
    }

    const parsedId = parseInt(targetId, 10);
    if (isNaN(parsedId)) {
      return res.status(400).json({ success: false, message: "Invalid target ID." });
    }

    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      return res.status(400).json({ success: false, message: "Please provide a reason for the report." });
    }

    await db.execute(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, targetType, parsedId, cleanReason, details ? String(details).trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: "Report submitted. Campus moderators will review it promptly."
    });
  } catch (error) {
    console.error("Report error:", error.message);
    return res.status(500).json({ success: false, message: "Could not submit report." });
  }
});

module.exports = router;
