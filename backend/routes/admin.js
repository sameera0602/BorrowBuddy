const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Apply admin guard to all routes in this router
router.use(requireAuth);
router.use(requireAdmin);

// ==========================================
// 1. GET PENDING LISTINGS FOR REVIEW
// ==========================================
router.get("/listings/pending", async function (req, res) {
  try {
    const [listings] = await db.execute(
      `SELECT 
        l.id, l.owner_id, l.title, l.category, l.description, l.item_condition,
        l.rental_price_per_day, l.deposit_amount, l.pickup_location, l.rules,
        l.status, l.created_at,
        COALESCE(u.full_name, 'Student') AS owner_name, u.college_email AS owner_email, COALESCE(u.department, 'SRMIST') AS owner_dept
       FROM listings l
       JOIN users u ON l.owner_id = u.id
       WHERE l.status = 'pending'
       ORDER BY l.created_at ASC`
    );

    if (listings.length > 0) {
      const ids = listings.map((l) => l.id);
      const placeholders = ids.map(() => "?").join(",");
      const [images] = await db.query(
        `SELECT listing_id, image_url FROM listing_images WHERE listing_id IN (${placeholders})`,
        ids
      );

      const imgMap = {};
      images.forEach((img) => {
        if (!imgMap[img.listing_id]) imgMap[img.listing_id] = [];
        imgMap[img.listing_id].push(img.image_url);
      });

      listings.forEach((l) => {
        l.images = imgMap[l.id] || [];
      });
    }

    return res.json({
      success: true,
      listings
    });
  } catch (error) {
    console.error("Admin fetch pending listings error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch pending listings." });
  }
});

// ==========================================
// 2. APPROVE LISTING
// ==========================================
router.patch("/listings/:id/approve", async function (req, res) {
  try {
    const listingId = parseInt(req.params.id, 10);
    if (isNaN(listingId)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    await db.execute("UPDATE listings SET status = 'approved', rejection_reason = NULL WHERE id = ?", [listingId]);

    // Record audit log
    await db.execute(
      `INSERT INTO moderation_audit_logs (admin_id, action, target_type, target_id, notes)
       VALUES (?, 'approve_listing', 'listing', ?, 'Listing approved for student marketplace')`,
      [req.user.id, listingId]
    );

    return res.json({
      success: true,
      message: "Listing approved! It is now visible to all students in Borrow."
    });
  } catch (error) {
    console.error("Admin approve listing error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to approve listing." });
  }
});

// ==========================================
// 3. REJECT LISTING WITH REASON
// ==========================================
router.patch("/listings/:id/reject", async function (req, res) {
  try {
    const listingId = parseInt(req.params.id, 10);
    const reason = String(req.body.reason || "").trim();

    if (isNaN(listingId)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: "Please provide a reason for rejecting the listing." });
    }

    await db.execute(
      "UPDATE listings SET status = 'rejected', rejection_reason = ? WHERE id = ?",
      [reason, listingId]
    );

    // Record audit log
    await db.execute(
      `INSERT INTO moderation_audit_logs (admin_id, action, target_type, target_id, notes)
       VALUES (?, 'reject_listing', 'listing', ?, ?)`,
      [req.user.id, listingId, `Rejected reason: ${reason}`]
    );

    return res.json({
      success: true,
      message: "Listing rejected and owner notified."
    });
  } catch (error) {
    console.error("Admin reject listing error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to reject listing." });
  }
});

// ==========================================
// 4. GET ALL LISTINGS FOR MODERATION
// ==========================================
router.get("/listings/all", async function (req, res) {
  try {
    const [listings] = await db.execute(
      `SELECT 
        l.id, l.title, l.category, l.rental_price_per_day, l.status, l.created_at,
        u.full_name AS owner_name, u.college_email AS owner_email
       FROM listings l
       JOIN users u ON l.owner_id = u.id
       ORDER BY l.created_at DESC LIMIT 100`
    );

    return res.json({
      success: true,
      listings
    });
  } catch (error) {
    console.error("Admin fetch all listings error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch listings." });
  }
});

// ==========================================
// 5. SUSPEND OR RESTORE LISTING
// ==========================================
router.patch("/listings/:id/suspend", async function (req, res) {
  try {
    const listingId = parseInt(req.params.id, 10);
    const { suspend } = req.body;

    const newStatus = suspend ? "suspended" : "approved";

    await db.execute("UPDATE listings SET status = ? WHERE id = ?", [newStatus, listingId]);

    await db.execute(
      `INSERT INTO moderation_audit_logs (admin_id, action, target_type, target_id, notes)
       VALUES (?, ?, 'listing', ?, ?)`,
      [req.user.id, suspend ? "suspend_listing" : "restore_listing", listingId, `Listing marked as ${newStatus}`]
    );

    return res.json({
      success: true,
      message: `Listing is now ${newStatus}.`
    });
  } catch (error) {
    console.error("Admin suspend listing error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update listing." });
  }
});

// ==========================================
// 6. GET REPORTS
// ==========================================
router.get("/reports", async function (req, res) {
  try {
    const [reports] = await db.execute(
      `SELECT 
        r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
        u.full_name AS reporter_name, u.college_email AS reporter_email
       FROM reports r
       JOIN users u ON r.reporter_id = u.id
       ORDER BY r.created_at DESC`
    );

    return res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error("Admin fetch reports error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch reports." });
  }
});

// ==========================================
// 7. GET AUDIT LOGS
// ==========================================
router.get("/audit-logs", async function (req, res) {
  try {
    const [logs] = await db.execute(
      `SELECT 
        m.id, m.action, m.target_type, m.target_id, m.notes, m.created_at,
        u.full_name AS admin_name, u.college_email AS admin_email
       FROM moderation_audit_logs m
       JOIN users u ON m.admin_id = u.id
       ORDER BY m.created_at DESC LIMIT 100`
    );

    return res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error("Admin fetch audit logs error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch audit logs." });
  }
});

// ==========================================
// 8. GET ALL HELP REQUESTS FOR MODERATION
// ==========================================
router.get("/help-requests", async function (req, res) {
  try {
    const [requests] = await db.execute(
      `SELECT 
        hr.id, hr.title, hr.category, hr.description, hr.deadline, hr.budget, hr.status, hr.created_at,
        COALESCE(u.full_name, 'Student') AS requester_name, u.college_email AS requester_email, COALESCE(u.department, 'SRMIST') AS requester_dept,
        COUNT(ho.id) AS offer_count
       FROM help_requests hr
       JOIN users u ON hr.requester_id = u.id
       LEFT JOIN help_offers ho ON ho.help_request_id = hr.id
       GROUP BY hr.id
       ORDER BY hr.created_at DESC LIMIT 100`
    );

    return res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error("Admin fetch help requests error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch help requests." });
  }
});

// ==========================================
// 9. UPDATE HELP REQUEST STATUS (MODERATION)
// ==========================================
router.patch("/help-requests/:id/status", async function (req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(requestId) || !["open", "assigned", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status or request ID." });
    }

    await db.execute("UPDATE help_requests SET status = ? WHERE id = ?", [status, requestId]);

    await db.execute(
      `INSERT INTO moderation_audit_logs (admin_id, action, target_type, target_id, notes)
       VALUES (?, 'update_help_request', 'help_request', ?, ?)`,
      [req.user.id, requestId, `Status changed to ${status}`]
    );

    return res.json({
      success: true,
      message: `Help request marked as ${status}.`
    });
  } catch (error) {
    console.error("Admin update help request error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update help request." });
  }
});

// ==========================================
// 10. GET ALL CONVERSATIONS (CHAT SURVEILLANCE & MONITORING)
// ==========================================
router.get("/conversations", async function (req, res) {
  try {
    const [conversations] = await db.execute(
      `SELECT 
        c.id, c.type, c.booking_id, c.help_request_id, c.created_at, c.updated_at,
        c.user1_id, c.user2_id,
        COALESCE(u1.full_name, 'Student') AS user1_name, u1.college_email AS user1_email,
        COALESCE(u2.full_name, 'Student') AS user2_name, u2.college_email AS user2_email,
        l.title AS item_title,
        hr.title AS help_title,
        COUNT(m.id) AS message_count
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       LEFT JOIN bookings b ON c.booking_id = b.id
       LEFT JOIN listings l ON b.listing_id = l.id
       LEFT JOIN help_requests hr ON c.help_request_id = hr.id
       LEFT JOIN messages m ON m.conversation_id = c.id
       GROUP BY c.id
       ORDER BY c.updated_at DESC LIMIT 100`
    );

    // Fetch latest message for each
    for (const conv of conversations) {
      const [lastMsg] = await db.execute(
        `SELECT m.id, m.message_text, m.created_at, m.sender_id,
                COALESCE(u.full_name, 'Student') AS sender_name, u.college_email AS sender_email
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at DESC LIMIT 1`,
        [conv.id]
      );
      conv.last_message = lastMsg.length > 0 ? lastMsg[0] : null;
    }

    return res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error("Admin fetch conversations error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch student conversations." });
  }
});

// ==========================================
// 11. GET FULL CONVERSATION TRANSCRIPT (ADMIN AUDIT)
// ==========================================
router.get("/conversations/:id/messages", async function (req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (isNaN(convId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID." });
    }

    const [convRows] = await db.execute(
      `SELECT c.id, c.type, c.user1_id, c.user2_id, c.created_at,
              COALESCE(u1.full_name, 'Student') AS user1_name, u1.college_email AS user1_email,
              COALESCE(u2.full_name, 'Student') AS user2_name, u2.college_email AS user2_email,
              l.title AS item_title, hr.title AS help_title
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       LEFT JOIN bookings b ON c.booking_id = b.id
       LEFT JOIN listings l ON b.listing_id = l.id
       LEFT JOIN help_requests hr ON c.help_request_id = hr.id
       WHERE c.id = ?`,
      [convId]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    const [messages] = await db.execute(
      `SELECT m.id, m.conversation_id, m.sender_id, m.message_text, m.created_at,
              COALESCE(u.full_name, 'Student') AS sender_name, u.college_email AS sender_email
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [convId]
    );

    return res.json({
      success: true,
      conversation: convRows[0],
      messages
    });
  } catch (error) {
    console.error("Admin fetch messages error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch conversation transcript." });
  }
});

// ==========================================
// 12. MODERATE / DELETE INAPPROPRIATE MESSAGE
// ==========================================
router.delete("/messages/:id", async function (req, res) {
  try {
    const messageId = parseInt(req.params.id, 10);
    if (isNaN(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID." });
    }

    const [rows] = await db.execute("SELECT id, conversation_id, sender_id, message_text FROM messages WHERE id = ?", [messageId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    await db.execute("DELETE FROM messages WHERE id = ?", [messageId]);

    // Record audit log
    await db.execute(
      `INSERT INTO moderation_audit_logs (admin_id, action, target_type, target_id, notes)
       VALUES (?, 'delete_message', 'message', ?, ?)`,
      [req.user.id, messageId, `Deleted message snippet: "${rows[0].message_text.slice(0, 50)}..."`]
    );

    return res.json({
      success: true,
      message: "Message deleted and logged in moderation history."
    });
  } catch (error) {
    console.error("Admin delete message error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete message." });
  }
});

module.exports = router;
