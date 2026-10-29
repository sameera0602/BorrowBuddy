const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. GET ALL CONVERSATIONS FOR CURRENT USER
// ==========================================
router.get("/", requireAuth, async function (req, res) {
  try {
    const currentUserId = req.user.id;

    const [conversations] = await db.execute(
      `SELECT 
        c.id, c.type, c.booking_id, c.help_request_id, c.created_at, c.updated_at,
        c.user1_id, c.user2_id,
        u1.full_name AS user1_name, u1.college_email AS user1_email,
        u2.full_name AS user2_name, u2.college_email AS user2_email,
        l.title AS item_title,
        hr.title AS help_title
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       LEFT JOIN bookings b ON c.booking_id = b.id
       LEFT JOIN listings l ON b.listing_id = l.id
       LEFT JOIN help_requests hr ON c.help_request_id = hr.id
       WHERE c.user1_id = ? OR c.user2_id = ?
       ORDER BY c.updated_at DESC`,
      [currentUserId, currentUserId]
    );

    // Fetch latest message for each conversation
    for (const conv of conversations) {
      const isUser1 = conv.user1_id === currentUserId;
      conv.other_user = {
        id: isUser1 ? conv.user2_id : conv.user1_id,
        name: isUser1 ? conv.user2_name : conv.user1_name,
        email: isUser1 ? conv.user2_email : conv.user1_email
      };

      const [lastMsg] = await db.execute(
        `SELECT message_text, created_at, sender_id 
         FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [conv.id]
      );

      conv.last_message = lastMsg.length > 0 ? lastMsg[0] : null;
    }

    return res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error("Fetch conversations error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch conversations." });
  }
});

// ==========================================
// 2. GET MESSAGES IN CONVERSATION
// ==========================================
router.get("/:id/messages", requireAuth, async function (req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (isNaN(convId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID." });
    }

    // Verify participant or admin
    const [convRows] = await db.execute(
      `SELECT c.id, c.type, c.user1_id, c.user2_id, c.booking_id, c.help_request_id,
              u1.full_name AS user1_name, u2.full_name AS user2_name,
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

    const conv = convRows[0];
    const isParticipant = conv.user1_id === req.user.id || conv.user2_id === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ success: false, message: "You are not authorized to view this conversation." });
    }

    const [messages] = await db.execute(
      `SELECT m.id, m.conversation_id, m.sender_id, m.message_text, m.created_at,
              u.full_name AS sender_name, u.college_email AS sender_email
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [convId]
    );

    const isUser1 = conv.user1_id === req.user.id;
    const partner = {
      id: isUser1 ? conv.user2_id : conv.user1_id,
      name: isUser1 ? conv.user2_name : conv.user1_name
    };

    return res.json({
      success: true,
      conversation: {
        id: conv.id,
        type: conv.type,
        title: conv.item_title || conv.help_title || "Direct Message",
        partner
      },
      messages
    });
  } catch (error) {
    console.error("Get messages error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load messages." });
  }
});

// ==========================================
// 3. SEND MESSAGE IN CONVERSATION
// ==========================================
router.post("/:id/messages", requireAuth, async function (req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    const messageText = String(req.body.messageText || "").trim();

    if (isNaN(convId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID." });
    }

    if (!messageText) {
      return res.status(400).json({ success: false, message: "Message cannot be empty." });
    }

    if (messageText.length > 2000) {
      return res.status(400).json({ success: false, message: "Message cannot exceed 2000 characters." });
    }

    // Verify participation
    const [convRows] = await db.execute(
      "SELECT user1_id, user2_id FROM conversations WHERE id = ?",
      [convId]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    const conv = convRows[0];
    if (conv.user1_id !== req.user.id && conv.user2_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not a participant in this conversation." });
    }

    // Insert message
    const [result] = await db.execute(
      `INSERT INTO messages (conversation_id, sender_id, message_text)
       VALUES (?, ?, ?)`,
      [convId, req.user.id, messageText]
    );

    // Update conversation timestamp
    await db.execute("UPDATE conversations SET updated_at = NOW() WHERE id = ?", [convId]);

    return res.status(201).json({
      success: true,
      message: {
        id: result.insertId,
        conversation_id: convId,
        sender_id: req.user.id,
        sender_name: req.user.full_name || req.user.college_email,
        message_text: messageText,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error("Send message error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

// ==========================================
// 4. START OR OPEN DIRECT CHAT (FOR CAMPUS FAVORS & DM)
// ==========================================
router.post("/start-direct", requireAuth, async function (req, res) {
  try {
    const { helpRequestId, targetUserId, initialMessage } = req.body;
    const currentUserId = req.user.id;

    let otherUserId = targetUserId ? parseInt(targetUserId, 10) : null;
    let hrId = helpRequestId ? parseInt(helpRequestId, 10) : null;

    if (hrId) {
      const [hrRows] = await db.execute("SELECT id, requester_id, title FROM help_requests WHERE id = ?", [hrId]);
      if (hrRows.length === 0) {
        return res.status(404).json({ success: false, message: "Request or favor not found." });
      }
      otherUserId = hrRows[0].requester_id;
    }

    if (!otherUserId || isNaN(otherUserId)) {
      return res.status(400).json({ success: false, message: "Target student required." });
    }

    if (otherUserId === currentUserId) {
      return res.status(400).json({ success: false, message: "You cannot start a direct chat with yourself." });
    }

    // Check if an existing conversation exists between these two users
    let query = `
      SELECT id FROM conversations 
      WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
    `;
    const params = [currentUserId, otherUserId, otherUserId, currentUserId];

    if (hrId) {
      query += " AND help_request_id = ?";
      params.push(hrId);
    }

    query += " LIMIT 1";

    const [existing] = await db.execute(query, params);

    let conversationId;

    if (existing.length > 0) {
      conversationId = existing[0].id;
    } else {
      const [result] = await db.execute(
        `INSERT INTO conversations (type, help_request_id, user1_id, user2_id)
         VALUES ('help', ?, ?, ?)`,
        [hrId || null, currentUserId, otherUserId]
      );
      conversationId = result.insertId;

      const initText = initialMessage ? String(initialMessage).trim() : `Hi! I saw your post on campus favors and would like to chat!`;
      await db.execute(
        `INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)`,
        [conversationId, currentUserId, initText]
      );
    }

    return res.json({
      success: true,
      conversationId
    });
  } catch (err) {
    console.error("Start direct chat error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to start direct chat." });
  }
});

module.exports = router;
