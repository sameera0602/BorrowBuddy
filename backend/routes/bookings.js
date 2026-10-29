const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. CREATE BOOKING REQUEST
// ==========================================
router.post("/", requireAuth, async function (req, res) {
  try {
    const { listingId, startDate, endDate, borrowerNotes } = req.body;

    const parsedListingId = parseInt(listingId, 10);
    if (isNaN(parsedListingId)) {
      return res.status(400).json({ success: false, message: "Valid listing ID is required." });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Please specify both start date and end date." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format." });
    }

    if (start < now) {
      return res.status(400).json({ success: false, message: "Start date cannot be in the past." });
    }

    if (end < start) {
      return res.status(400).json({ success: false, message: "End date must be on or after start date." });
    }

    // Calculate days (inclusive)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Fetch listing
    const [listings] = await db.execute(
      "SELECT id, owner_id, title, rental_price_per_day, status FROM listings WHERE id = ?",
      [parsedListingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    const listing = listings[0];

    if (listing.status !== "approved") {
      return res.status(400).json({ success: false, message: "This listing is not currently available for booking." });
    }

    if (listing.owner_id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot borrow your own item." });
    }

    // Check for overlapping confirmed bookings
    const formattedStart = start.toISOString().split("T")[0];
    const formattedEnd = end.toISOString().split("T")[0];

    const [conflicts] = await db.execute(
      `SELECT id FROM bookings
       WHERE listing_id = ?
       AND status IN ('accepted', 'active')
       AND NOT (end_date < ? OR start_date > ?)`,
      [parsedListingId, formattedStart, formattedEnd]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "The requested dates are already reserved. Please choose different dates."
      });
    }

    const totalPrice = rentalDays * parseFloat(listing.rental_price_per_day);

    const [result] = await db.execute(
      `INSERT INTO bookings 
       (listing_id, borrower_id, owner_id, start_date, end_date, total_price, status, borrower_notes)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        parsedListingId,
        req.user.id,
        listing.owner_id,
        formattedStart,
        formattedEnd,
        totalPrice,
        borrowerNotes ? String(borrowerNotes).trim() : null
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Borrow request submitted! The owner has been notified and can review your request.",
      bookingId: result.insertId,
      rentalDays,
      totalPrice
    });
  } catch (error) {
    console.error("Create booking error:", error.message);
    return res.status(500).json({ success: false, message: "Could not create booking request." });
  }
});

// ==========================================
// 2. GET MY BORROWINGS
// ==========================================
router.get("/my-borrowings", requireAuth, async function (req, res) {
  try {
    const [borrowings] = await db.execute(
      `SELECT 
        b.id, b.listing_id, b.start_date, b.end_date, b.total_price, b.status,
        b.borrower_notes, b.owner_response_notes, b.created_at,
        l.title AS item_title, l.category, l.pickup_location, l.rental_price_per_day, l.deposit_amount,
        u.full_name AS owner_name, u.college_email AS owner_email,
        c.id AS conversation_id
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON b.owner_id = u.id
       LEFT JOIN conversations c ON c.booking_id = b.id
       WHERE b.borrower_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    // Fetch primary images
    if (borrowings.length > 0) {
      const listingIds = [...new Set(borrowings.map((b) => b.listing_id))];
      const placeholders = listingIds.map(() => "?").join(",");
      const [images] = await db.query(
        `SELECT listing_id, image_url FROM listing_images WHERE listing_id IN (${placeholders}) AND is_primary = TRUE`,
        listingIds
      );

      const imageMap = {};
      images.forEach((img) => (imageMap[img.listing_id] = img.image_url));
      borrowings.forEach((b) => (b.image_url = imageMap[b.listing_id] || null));
    }

    return res.json({
      success: true,
      borrowings
    });
  } catch (error) {
    console.error("Fetch borrowings error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch borrowings." });
  }
});

// ==========================================
// 3. GET MY LENDING (Incoming Requests + My Listings)
// ==========================================
router.get("/my-lending", requireAuth, async function (req, res) {
  try {
    // 1. Incoming & active booking requests on my items
    const [incomingRequests] = await db.execute(
      `SELECT 
        b.id, b.listing_id, b.start_date, b.end_date, b.total_price, b.status,
        b.borrower_notes, b.owner_response_notes, b.created_at,
        l.title AS item_title, l.category, l.pickup_location,
        u.full_name AS borrower_name, u.college_email AS borrower_email,
        c.id AS conversation_id
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON b.borrower_id = u.id
       LEFT JOIN conversations c ON c.booking_id = b.id
       WHERE b.owner_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    // 2. All my listings
    const [myListings] = await db.execute(
      `SELECT 
        l.id, l.title, l.category, l.item_condition, l.rental_price_per_day,
        l.deposit_amount, l.pickup_location, l.status, l.rejection_reason, l.created_at
       FROM listings l
       WHERE l.owner_id = ?
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );

    if (myListings.length > 0) {
      const listingIds = myListings.map((l) => l.id);
      const placeholders = listingIds.map(() => "?").join(",");
      const [images] = await db.query(
        `SELECT listing_id, image_url FROM listing_images WHERE listing_id IN (${placeholders})`,
        listingIds
      );

      const imageMap = {};
      images.forEach((img) => {
        if (!imageMap[img.listing_id]) imageMap[img.listing_id] = [];
        imageMap[img.listing_id].push(img.image_url);
      });

      myListings.forEach((l) => {
        l.images = imageMap[l.id] || [];
        l.primary_image = l.images[0] || null;
      });
    }

    return res.json({
      success: true,
      incomingRequests,
      myListings
    });
  } catch (error) {
    console.error("Fetch lending error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch lending data." });
  }
});

// ==========================================
// 4. UPDATE BOOKING STATUS (Accept, Decline, Cancel, Complete)
// ==========================================
router.patch("/:id/status", requireAuth, async function (req, res) {
  let connection;
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { newStatus, responseNotes } = req.body;

    const validStatuses = ["accepted", "declined", "cancelled", "active", "completed"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: "Invalid booking status." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, listing_id, borrower_id, owner_id, start_date, end_date, status
       FROM bookings
       WHERE id = ?
       FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Booking request not found." });
    }

    const booking = rows[0];

    // Authorization & State Transition Check
    if (newStatus === "accepted" || newStatus === "declined") {
      if (booking.owner_id !== req.user.id) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: "Only the item owner can accept or decline requests." });
      }
      if (booking.status !== "pending") {
        await connection.rollback();
        return res.status(400).json({ success: false, message: `Cannot change status from ${booking.status} to ${newStatus}.` });
      }

      // If accepting, strictly check for conflicting confirmed bookings
      if (newStatus === "accepted") {
        const formattedStart = new Date(booking.start_date).toISOString().split("T")[0];
        const formattedEnd = new Date(booking.end_date).toISOString().split("T")[0];

        const [conflicts] = await connection.execute(
          `SELECT id FROM bookings
           WHERE listing_id = ?
           AND id != ?
           AND status IN ('accepted', 'active')
           AND NOT (end_date < ? OR start_date > ?)
           FOR UPDATE`,
          [booking.listing_id, bookingId, formattedStart, formattedEnd]
        );

        if (conflicts.length > 0) {
          await connection.rollback();
          return res.status(409).json({
            success: false,
            message: "Cannot accept: This item already has a confirmed booking for these dates."
          });
        }
      }
    } else if (newStatus === "cancelled") {
      if (booking.borrower_id !== req.user.id && req.user.role !== "admin") {
        await connection.rollback();
        return res.status(403).json({ success: false, message: "Only the borrower can cancel this request." });
      }
      if (!["pending", "accepted"].includes(booking.status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "This booking can no longer be cancelled." });
      }
    } else if (newStatus === "active") {
      if (booking.owner_id !== req.user.id && booking.borrower_id !== req.user.id) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: "Unauthorized." });
      }
    } else if (newStatus === "completed") {
      if (booking.owner_id !== req.user.id && booking.borrower_id !== req.user.id && req.user.role !== "admin") {
        await connection.rollback();
        return res.status(403).json({ success: false, message: "Unauthorized." });
      }
    }

    // Update booking status
    await connection.execute(
      `UPDATE bookings 
       SET status = ?, owner_response_notes = COALESCE(?, owner_response_notes)
       WHERE id = ?`,
      [newStatus, responseNotes ? String(responseNotes).trim() : null, bookingId]
    );

    // If accepted, automatically ensure a private conversation exists and send confirmation message
    let conversationId = null;
    if (newStatus === "accepted") {
      const [existingConv] = await connection.execute(
        "SELECT id FROM conversations WHERE booking_id = ? LIMIT 1",
        [bookingId]
      );

      if (existingConv.length > 0) {
        conversationId = existingConv[0].id;
      } else {
        const [convResult] = await connection.execute(
          `INSERT INTO conversations (type, booking_id, user1_id, user2_id)
           VALUES ('booking', ?, ?, ?)`,
          [bookingId, booking.borrower_id, booking.owner_id]
        );
        conversationId = convResult.insertId;

        // Add initial system message
        await connection.execute(
          `INSERT INTO messages (conversation_id, sender_id, message_text)
           VALUES (?, ?, ?)`,
          [
            conversationId,
            booking.owner_id,
            "Hi! Your borrow request has been accepted. Use this chat to coordinate pickup and return on campus."
          ]
        );
      }
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `Booking has been marked as ${newStatus}.`,
      status: newStatus,
      conversationId
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Update booking status error:", error.message);
    return res.status(500).json({ success: false, message: "Could not update booking status." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
