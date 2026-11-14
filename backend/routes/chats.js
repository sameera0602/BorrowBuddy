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
        c.id, c.type, c.booking_id, c.listing_id, c.help_request_id, c.created_at, c.updated_at,
        c.user1_id, c.user2_id,
        u1.full_name AS user1_name, u1.college_email AS user1_email,
        u2.full_name AS user2_name, u2.college_email AS user2_email,
        COALESCE(l.title, l2.title) AS item_title,
        COALESCE(l.id, l2.id) AS item_id,
        COALESCE(l.rental_price_per_day, l2.rental_price_per_day) AS rental_price_per_day,
        COALESCE(l.pickup_location, l2.pickup_location) AS pickup_location,
        COALESCE(l.owner_id, l2.owner_id) AS item_owner_id,
        hr.title AS help_title,
        b.status AS booking_status,
        b.borrower_confirmed_pickup,
        b.lender_confirmed_pickup,
        b.borrower_confirmed_return,
        b.lender_confirmed_return,
        b.borrower_id AS booking_borrower_id,
        b.owner_id AS booking_owner_id,
        b.total_price AS booking_total_price,
        b.start_date AS booking_start_date,
        b.end_date AS booking_end_date
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       LEFT JOIN bookings b ON c.booking_id = b.id
       LEFT JOIN listings l ON b.listing_id = l.id
       LEFT JOIN listings l2 ON c.listing_id = l2.id
       LEFT JOIN help_requests hr ON c.help_request_id = hr.id
       WHERE c.user1_id = ? OR c.user2_id = ?
       ORDER BY c.updated_at DESC`,
      [currentUserId, currentUserId]
    );

    // Fetch primary image and latest message for each conversation
    for (const conv of conversations) {
      const isUser1 = conv.user1_id === currentUserId;
      conv.other_user = {
        id: isUser1 ? conv.user2_id : conv.user1_id,
        name: isUser1 ? conv.user2_name : conv.user1_name,
        email: isUser1 ? conv.user2_email : conv.user1_email
      };

      if (conv.item_id) {
        const [imgs] = await db.execute(
          "SELECT image_url FROM listing_images WHERE listing_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1",
          [conv.item_id]
        );
        conv.item_image = imgs.length > 0 ? imgs[0].image_url : null;
      }

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
// 2. GET MESSAGES IN CONVERSATION WITH ITEM/BOOKING CONTEXT
// ==========================================
router.get("/:id/messages", requireAuth, async function (req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (isNaN(convId)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID." });
    }

    // Verify participant or admin
    const [convRows] = await db.execute(
      `SELECT c.id, c.type, c.user1_id, c.user2_id, c.booking_id, c.listing_id, c.help_request_id,
              u1.full_name AS user1_name, u1.college_email AS user1_email,
              u2.full_name AS user2_name, u2.college_email AS user2_email,
              COALESCE(l.title, l2.title) AS item_title,
              COALESCE(l.id, l2.id) AS item_id,
              COALESCE(l.rental_price_per_day, l2.rental_price_per_day) AS rental_price_per_day,
              COALESCE(l.deposit_amount, l2.deposit_amount) AS deposit_amount,
              COALESCE(l.pickup_location, l2.pickup_location) AS pickup_location,
              COALESCE(l.owner_id, l2.owner_id) AS item_owner_id,
              hr.title AS help_title,
              b.id AS current_booking_id,
              b.status AS booking_status,
              b.borrower_confirmed_pickup,
              b.lender_confirmed_pickup,
              b.borrower_confirmed_return,
              b.lender_confirmed_return,
              b.borrower_id AS booking_borrower_id,
              b.owner_id AS booking_owner_id,
              b.total_price AS booking_total_price,
              b.agreed_price AS booking_agreed_price,
              b.start_date AS booking_start_date,
              b.end_date AS booking_end_date,
              b.borrower_notes,
              b.owner_response_notes
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       LEFT JOIN bookings b ON c.booking_id = b.id
       LEFT JOIN listings l ON b.listing_id = l.id
       LEFT JOIN listings l2 ON c.listing_id = l2.id
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
      name: isUser1 ? conv.user2_name : conv.user1_name,
      email: isUser1 ? conv.user2_email : conv.user1_email
    };

    // Item image if listing is attached
    let itemImage = null;
    if (conv.item_id) {
      const [imgs] = await db.execute(
        "SELECT image_url FROM listing_images WHERE listing_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1",
        [conv.item_id]
      );
      if (imgs.length > 0) itemImage = imgs[0].image_url;
    }

    // Role identification
    let userRole = "student";
    if (conv.current_booking_id) {
      if (req.user.id === conv.booking_owner_id) userRole = "lender";
      else if (req.user.id === conv.booking_borrower_id) userRole = "borrower";
    } else if (conv.item_id) {
      if (req.user.id === conv.item_owner_id) userRole = "lender";
      else userRole = "borrower";
    }

    const bookingContext = conv.current_booking_id
      ? {
          id: conv.current_booking_id,
          status: conv.booking_status,
          borrower_confirmed_pickup: Boolean(conv.borrower_confirmed_pickup),
          lender_confirmed_pickup: Boolean(conv.lender_confirmed_pickup),
          borrower_confirmed_return: Boolean(conv.borrower_confirmed_return),
          lender_confirmed_return: Boolean(conv.lender_confirmed_return),
          borrower_id: conv.booking_borrower_id,
          owner_id: conv.booking_owner_id,
          total_price: conv.booking_total_price,
          agreed_price: conv.booking_agreed_price,
          start_date: conv.booking_start_date,
          end_date: conv.booking_end_date,
          borrower_notes: conv.borrower_notes,
          owner_response_notes: conv.owner_response_notes
        }
      : null;

    const itemContext = conv.item_id
      ? {
          id: conv.item_id,
          title: conv.item_title,
          image_url: itemImage,
          rental_price_per_day: conv.rental_price_per_day,
          deposit_amount: conv.deposit_amount,
          pickup_location: conv.pickup_location,
          owner_id: conv.item_owner_id
        }
      : null;

    return res.json({
      success: true,
      conversation: {
        id: conv.id,
        type: conv.type,
        title: conv.item_title || conv.help_title || "Direct Message",
        booking_id: conv.booking_id,
        listing_id: conv.listing_id,
        partner,
        item: itemContext,
        booking: bookingContext,
        userRole
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
// 4. START OR OPEN DIRECT CHAT FOR A LISTING ITEM
// ==========================================
router.post("/item", requireAuth, async function (req, res) {
  try {
    const { listingId, initialMessage } = req.body;
    const currentUserId = req.user.id;

    const parsedListingId = parseInt(listingId, 10);
    if (isNaN(parsedListingId)) {
      return res.status(400).json({ success: false, message: "Valid listing ID is required." });
    }

    const [listings] = await db.execute(
      "SELECT id, owner_id, title, rental_price_per_day, pickup_location FROM listings WHERE id = ?",
      [parsedListingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    const listing = listings[0];
    const ownerId = listing.owner_id;

    if (ownerId === currentUserId) {
      return res.status(400).json({ success: false, message: "You cannot start a chat with yourself on your own item." });
    }

    // Check if an existing conversation exists between current user and owner for this item/booking
    const [existing] = await db.execute(
      `SELECT c.id FROM conversations c
       LEFT JOIN bookings b ON c.booking_id = b.id
       WHERE ((c.user1_id = ? AND c.user2_id = ?) OR (c.user1_id = ? AND c.user2_id = ?))
       AND (c.listing_id = ? OR b.listing_id = ?)
       ORDER BY c.updated_at DESC
       LIMIT 1`,
      [currentUserId, ownerId, ownerId, currentUserId, parsedListingId, parsedListingId]
    );

    let conversationId;

    if (existing.length > 0) {
      conversationId = existing[0].id;
      if (initialMessage && initialMessage.trim()) {
        await db.execute(
          "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)",
          [conversationId, currentUserId, String(initialMessage).trim()]
        );
        await db.execute("UPDATE conversations SET updated_at = NOW() WHERE id = ?", [conversationId]);
      }
    } else {
      // Check if there is an existing booking between them
      const [bookings] = await db.execute(
        `SELECT id FROM bookings 
         WHERE listing_id = ? AND borrower_id = ? 
         ORDER BY id DESC LIMIT 1`,
        [parsedListingId, currentUserId]
      );
      const bookingId = bookings.length > 0 ? bookings[0].id : null;

      const [resConv] = await db.execute(
        `INSERT INTO conversations (type, booking_id, listing_id, user1_id, user2_id)
         VALUES ('listing', ?, ?, ?, ?)`,
        [bookingId, parsedListingId, currentUserId, ownerId]
      );
      conversationId = resConv.insertId;

      const initText = initialMessage && initialMessage.trim()
        ? String(initialMessage).trim()
        : `Hi! I saw your listing for "${listing.title}" (₹${listing.rental_price_per_day}/day at ${listing.pickup_location}) and would like to chat & coordinate!`;

      await db.execute(
        "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)",
        [conversationId, currentUserId, initText]
      );
    }

    return res.json({
      success: true,
      conversationId,
      listingTitle: listing.title
    });
  } catch (err) {
    console.error("Start item chat error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to open item chat." });
  }
});

// ==========================================
// 5. START OR OPEN DIRECT CHAT (FOR CAMPUS FAVORS & DM)
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
