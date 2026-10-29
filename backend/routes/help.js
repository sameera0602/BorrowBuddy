const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const VALID_CATEGORIES = [
  "General Campus Favor",
  "Borrowing Item Request",
  "Study Notes & Materials",
  "Docs and Formatting",
  "Slides and Design",
  "Proofread and Polish",
  "Study Together",
  "Peer Tutoring",
  "Project Support"
];

// ==========================================
// 1. BROWSE OPEN HELP REQUESTS
// ==========================================
router.get("/", async function (req, res) {
  try {
    const { category, search } = req.query;

    let query = `
      SELECT 
        hr.id, hr.requester_id, hr.title, hr.category, hr.description,
        hr.deadline, hr.budget, hr.status, hr.created_at,
        u.full_name AS requester_name, u.college_email AS requester_email, u.department AS requester_dept,
        COUNT(ho.id) AS offer_count
      FROM help_requests hr
      JOIN users u ON hr.requester_id = u.id
      LEFT JOIN help_offers ho ON ho.help_request_id = hr.id
      WHERE hr.status = 'open'
    `;
    const params = [];

    if (category && category !== "All") {
      query += " AND hr.category = ?";
      params.push(category);
    }

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      query += " AND (hr.title LIKE ? OR hr.description LIKE ?)";
      params.push(term, term);
    }

    query += " GROUP BY hr.id ORDER BY hr.created_at DESC LIMIT 50";

    const [requests] = await db.execute(query, params);

    return res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error("Browse help error:", error.message);
    return res.status(500).json({ success: false, message: "Could not fetch help requests." });
  }
});

// ==========================================
// 2. CREATE A HELP REQUEST
// ==========================================
router.post("/", requireAuth, async function (req, res) {
  try {
    const { title, category, description, deadline, budget } = req.body;

    const cleanTitle = String(title || "").trim();
    const cleanCat = String(category || "").trim();
    const cleanDesc = String(description || "").trim();
    const parsedBudget = parseFloat(budget || "0");

    if (cleanTitle.length < 5 || cleanTitle.length > 150) {
      return res.status(400).json({ success: false, message: "Title must be between 5 and 150 characters." });
    }

    if (!VALID_CATEGORIES.includes(cleanCat)) {
      return res.status(400).json({ success: false, message: "Please select a valid academic support category." });
    }

    if (cleanDesc.length < 15) {
      return res.status(400).json({ success: false, message: "Please describe the task or support needed in detail." });
    }

    // Academic integrity keywords check
    const prohibitedWords = ["take my exam", "write my exam", "proxy attendance", "plagiarism for me", "cheat"];
    const lowerContent = (cleanTitle + " " + cleanDesc).toLowerCase();
    for (const word of prohibitedWords) {
      if (lowerContent.includes(word)) {
        return res.status(400).json({
          success: false,
          message: "Requests promoting academic dishonesty, ghostwriting graded exams, or attendance proxy are strictly prohibited."
        });
      }
    }

    let formattedDeadline = null;
    if (deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime())) {
        formattedDeadline = d.toISOString().split("T")[0];
      }
    }

    const [result] = await db.execute(
      `INSERT INTO help_requests (requester_id, title, category, description, deadline, budget, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [
        req.user.id,
        cleanTitle,
        cleanCat,
        cleanDesc,
        formattedDeadline,
        isNaN(parsedBudget) ? 0 : parsedBudget
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Help request posted successfully! Other students can now review and offer support.",
      requestId: result.insertId
    });
  } catch (error) {
    console.error("Create help request error:", error.message);
    return res.status(500).json({ success: false, message: "Could not create help request." });
  }
});

// ==========================================
// 3. GET MY HELP REQUESTS (with incoming offers)
// ==========================================
router.get("/my-requests", requireAuth, async function (req, res) {
  try {
    const [requests] = await db.execute(
      `SELECT 
        hr.id, hr.title, hr.category, hr.description, hr.deadline, hr.budget, hr.status, hr.created_at,
        c.id AS conversation_id
       FROM help_requests hr
       LEFT JOIN conversations c ON c.help_request_id = hr.id
       WHERE hr.requester_id = ?
       ORDER BY hr.created_at DESC`,
      [req.user.id]
    );

    if (requests.length > 0) {
      const requestIds = requests.map((r) => r.id);
      const placeholders = requestIds.map(() => "?").join(",");

      const [offers] = await db.query(
        `SELECT 
          ho.id, ho.help_request_id, ho.helper_id, ho.message, ho.price_quote, ho.status, ho.created_at,
          u.full_name AS helper_name, u.college_email AS helper_email, u.department AS helper_dept
         FROM help_offers ho
         JOIN users u ON ho.helper_id = u.id
         WHERE ho.help_request_id IN (${placeholders})
         ORDER BY ho.created_at DESC`,
        requestIds
      );

      const offersByRequest = {};
      offers.forEach((o) => {
        if (!offersByRequest[o.help_request_id]) offersByRequest[o.help_request_id] = [];
        offersByRequest[o.help_request_id].push(o);
      });

      requests.forEach((r) => {
        r.offers = offersByRequest[r.id] || [];
      });
    }

    return res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error("Fetch my help requests error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch help requests." });
  }
});

// ==========================================
// 4. SUBMIT OFFER TO HELP
// ==========================================
router.post("/:id/offers", requireAuth, async function (req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { message, priceQuote } = req.body;

    if (isNaN(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid request ID." });
    }

    const cleanMsg = String(message || "").trim();
    if (cleanMsg.length < 5) {
      return res.status(400).json({ success: false, message: "Please explain how you can help (min 5 characters)." });
    }

    const quote = parseFloat(priceQuote || "0");

    const [rows] = await db.execute(
      "SELECT id, requester_id, status FROM help_requests WHERE id = ?",
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Help request not found." });
    }

    const reqRecord = rows[0];

    if (reqRecord.requester_id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot offer help on your own request." });
    }

    if (reqRecord.status !== "open") {
      return res.status(400).json({ success: false, message: "This request is no longer open for offers." });
    }

    const [result] = await db.execute(
      `INSERT INTO help_offers (help_request_id, helper_id, message, price_quote, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [requestId, req.user.id, cleanMsg, isNaN(quote) ? 0 : quote]
    );

    return res.status(201).json({
      success: true,
      message: "Your offer has been submitted to the student!",
      offerId: result.insertId
    });
  } catch (error) {
    console.error("Submit offer error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to submit offer." });
  }
});

// ==========================================
// 5. ACCEPT OR DECLINE HELP OFFER
// ==========================================
router.patch("/offers/:offerId/status", requireAuth, async function (req, res) {
  let connection;
  try {
    const offerId = parseInt(req.params.offerId, 10);
    const { newStatus } = req.body;

    if (!["accepted", "declined"].includes(newStatus)) {
      return res.status(400).json({ success: false, message: "Invalid status update." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT ho.id, ho.help_request_id, ho.helper_id, ho.status,
              hr.requester_id, hr.title AS request_title
       FROM help_offers ho
       JOIN help_requests hr ON ho.help_request_id = hr.id
       WHERE ho.id = ?
       FOR UPDATE`,
      [offerId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    const offer = rows[0];

    if (offer.requester_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Only the requester can accept or decline offers." });
    }

    await connection.execute("UPDATE help_offers SET status = ? WHERE id = ?", [newStatus, offerId]);

    let conversationId = null;

    if (newStatus === "accepted") {
      await connection.execute("UPDATE help_requests SET status = 'assigned' WHERE id = ?", [offer.help_request_id]);

      // Check or create conversation
      const [existingConv] = await connection.execute(
        "SELECT id FROM conversations WHERE help_request_id = ? LIMIT 1",
        [offer.help_request_id]
      );

      if (existingConv.length > 0) {
        conversationId = existingConv[0].id;
      } else {
        const [convResult] = await connection.execute(
          `INSERT INTO conversations (type, help_request_id, user1_id, user2_id)
           VALUES ('help', ?, ?, ?)`,
          [offer.help_request_id, req.user.id, offer.helper_id]
        );
        conversationId = convResult.insertId;

        await connection.execute(
          `INSERT INTO messages (conversation_id, sender_id, message_text)
           VALUES (?, ?, ?)`,
          [
            conversationId,
            req.user.id,
            `Hi! I have accepted your offer to help with "${offer.request_title}". Let's discuss the details here!`
          ]
        );
      }
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `Offer marked as ${newStatus}.`,
      conversationId
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Update offer status error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update offer status." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
