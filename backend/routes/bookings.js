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
      "SELECT id, owner_id, title, rental_price_per_day, pickup_location, status FROM listings WHERE id = ?",
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

    const newBookingId = result.insertId;

    // Automatically create or link a personal conversation between borrower and owner for this request
    let conversationId = null;
    const [existingConvs] = await db.execute(
      `SELECT id FROM conversations 
       WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
       AND (listing_id = ? OR booking_id IN (SELECT id FROM bookings WHERE listing_id = ?))
       ORDER BY updated_at DESC LIMIT 1`,
      [req.user.id, listing.owner_id, listing.owner_id, req.user.id, parsedListingId, parsedListingId]
    );

    if (existingConvs.length > 0) {
      conversationId = existingConvs[0].id;
      await db.execute(
        "UPDATE conversations SET booking_id = ?, listing_id = ?, updated_at = NOW() WHERE id = ?",
        [newBookingId, parsedListingId, conversationId]
      );
    } else {
      const [cRes] = await db.execute(
        `INSERT INTO conversations (type, booking_id, listing_id, user1_id, user2_id)
         VALUES ('booking', ?, ?, ?, ?)`,
        [newBookingId, parsedListingId, req.user.id, listing.owner_id]
      );
      conversationId = cRes.insertId;
    }

    // Post request summary into the conversation
    const msgText = `📅 Borrow Request Submitted for "${listing.title}"\nDates: ${formattedStart} to ${formattedEnd} (${rentalDays} day${rentalDays > 1 ? "s" : ""})\nTotal Estimated: ₹${totalPrice}\nPickup Spot: ${listing.pickup_location}\n${borrowerNotes ? "Borrower Note: " + borrowerNotes : "Hi! I sent a borrow request. Let's negotiate and coordinate pickup details here!"}`;
    await db.execute(
      "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)",
      [conversationId, req.user.id, msgText]
    );

    return res.status(201).json({
      success: true,
      message: "Borrow request submitted! You can now chat personally with the owner to negotiate and coordinate.",
      bookingId: newBookingId,
      conversationId,
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
        b.borrower_confirmed_pickup, b.lender_confirmed_pickup,
        b.borrower_confirmed_return, b.lender_confirmed_return,
        b.agreed_price,
        l.title AS item_title, l.category, l.pickup_location, l.rental_price_per_day, l.deposit_amount,
        u.full_name AS owner_name, u.college_email AS owner_email,
        c.id AS conversation_id
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON b.owner_id = u.id
       LEFT JOIN conversations c ON (
         c.booking_id = b.id OR 
         (c.listing_id = b.listing_id AND ((c.user1_id = b.borrower_id AND c.user2_id = b.owner_id) OR (c.user1_id = b.owner_id AND c.user2_id = b.borrower_id)))
       )
       WHERE b.borrower_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    // Fetch primary images and deduplicate conversations if any
    const processed = [];
    const seenIds = new Set();

    for (const b of borrowings) {
      if (seenIds.has(b.id)) continue;
      seenIds.add(b.id);

      b.borrower_confirmed_pickup = Boolean(b.borrower_confirmed_pickup);
      b.lender_confirmed_pickup = Boolean(b.lender_confirmed_pickup);
      b.borrower_confirmed_return = Boolean(b.borrower_confirmed_return);
      b.lender_confirmed_return = Boolean(b.lender_confirmed_return);

      processed.push(b);
    }

    if (processed.length > 0) {
      const listingIds = [...new Set(processed.map((b) => b.listing_id))];
      const placeholders = listingIds.map(() => "?").join(",");
      const [images] = await db.query(
        `SELECT listing_id, image_url FROM listing_images WHERE listing_id IN (${placeholders}) AND is_primary = TRUE`,
        listingIds
      );

      const imageMap = {};
      images.forEach((img) => (imageMap[img.listing_id] = img.image_url));
      processed.forEach((b) => (b.image_url = imageMap[b.listing_id] || null));
    }

    return res.json({
      success: true,
      borrowings: processed
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
        b.borrower_confirmed_pickup, b.lender_confirmed_pickup,
        b.borrower_confirmed_return, b.lender_confirmed_return,
        b.agreed_price,
        l.title AS item_title, l.category, l.pickup_location, l.rental_price_per_day,
        u.full_name AS borrower_name, u.college_email AS borrower_email,
        c.id AS conversation_id
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u ON b.borrower_id = u.id
       LEFT JOIN conversations c ON (
         c.booking_id = b.id OR 
         (c.listing_id = b.listing_id AND ((c.user1_id = b.borrower_id AND c.user2_id = b.owner_id) OR (c.user1_id = b.owner_id AND c.user2_id = b.borrower_id)))
       )
       WHERE b.owner_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    const processedRequests = [];
    const seenReqIds = new Set();
    for (const r of incomingRequests) {
      if (seenReqIds.has(r.id)) continue;
      seenReqIds.add(r.id);

      r.borrower_confirmed_pickup = Boolean(r.borrower_confirmed_pickup);
      r.lender_confirmed_pickup = Boolean(r.lender_confirmed_pickup);
      r.borrower_confirmed_return = Boolean(r.borrower_confirmed_return);
      r.lender_confirmed_return = Boolean(r.lender_confirmed_return);

      processedRequests.push(r);
    }

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
      incomingRequests: processedRequests,
      myListings
    });
  } catch (error) {
    console.error("Fetch lending error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch lending data." });
  }
});

// ==========================================
// 4. UPDATE BOOKING STATUS (Accept, Decline, Cancel)
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
      `SELECT b.id, b.listing_id, b.borrower_id, b.owner_id, b.start_date, b.end_date, b.status,
              l.title AS item_title
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ?
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
    } else if (newStatus === "active" || newStatus === "completed") {
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

    // If accepted or declined, update / notify in conversation
    let conversationId = null;
    const [existingConv] = await connection.execute(
      `SELECT id FROM conversations 
       WHERE booking_id = ? OR (listing_id = ? AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)))
       ORDER BY updated_at DESC LIMIT 1`,
      [bookingId, booking.listing_id, booking.borrower_id, booking.owner_id, booking.owner_id, booking.borrower_id]
    );

    if (existingConv.length > 0) {
      conversationId = existingConv[0].id;
      await connection.execute(
        "UPDATE conversations SET booking_id = ?, updated_at = NOW() WHERE id = ?",
        [bookingId, conversationId]
      );
    } else {
      const [convResult] = await connection.execute(
        `INSERT INTO conversations (type, booking_id, listing_id, user1_id, user2_id)
         VALUES ('booking', ?, ?, ?, ?)`,
        [bookingId, booking.listing_id, booking.borrower_id, booking.owner_id]
      );
      conversationId = convResult.insertId;
    }

    let statusMsg = "";
    if (newStatus === "accepted") {
      statusMsg = `✅ Request Accepted by Owner! You can now meet to hand over the item. Both parties must confirm pickup in the app once received.`;
    } else if (newStatus === "declined") {
      statusMsg = `❌ Request Declined by Owner.${responseNotes ? " Reason: " + responseNotes : ""}`;
    } else if (newStatus === "cancelled") {
      statusMsg = `⚠️ Borrow request was cancelled by the borrower.`;
    }

    if (statusMsg) {
      await connection.execute(
        `INSERT INTO messages (conversation_id, sender_id, message_text)
         VALUES (?, ?, ?)`,
        [conversationId, req.user.id, statusMsg]
      );
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

// ==========================================
// 5. DUAL-CONFIRMATION HANDOVER (CONFIRM PICKUP)
// Both borrower and lender must confirm handover
// ==========================================
router.post("/:id/confirm-pickup", requireAuth, async function (req, res) {
  let connection;
  try {
    const bookingId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT b.*, l.title AS item_title, 
              u_bor.full_name AS borrower_name, u_own.full_name AS owner_name
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u_bor ON b.borrower_id = u_bor.id
       JOIN users u_own ON b.owner_id = u_own.id
       WHERE b.id = ? FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = rows[0];

    if (booking.borrower_id !== userId && booking.owner_id !== userId && req.user.role !== "admin") {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Unauthorized to confirm pickup for this booking." });
    }

    if (booking.status !== "accepted" && booking.status !== "active") {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Cannot confirm pickup for booking in '${booking.status}' status. The owner must accept the request first.` 
      });
    }

    const isBorrower = booking.borrower_id === userId;
    const isOwner = booking.owner_id === userId;

    let newBorrowerPickup = Boolean(booking.borrower_confirmed_pickup);
    let newLenderPickup = Boolean(booking.lender_confirmed_pickup);

    if (isBorrower) newBorrowerPickup = true;
    if (isOwner) newLenderPickup = true;

    const bothConfirmed = Boolean(newBorrowerPickup && newLenderPickup);
    const newStatus = bothConfirmed ? "active" : booking.status;

    await connection.execute(
      `UPDATE bookings 
       SET borrower_confirmed_pickup = ?, lender_confirmed_pickup = ?, status = ?
       WHERE id = ?`,
      [newBorrowerPickup ? 1 : 0, newLenderPickup ? 1 : 0, newStatus, bookingId]
    );

    // Post to conversation
    const [convRows] = await connection.execute(
      `SELECT id FROM conversations 
       WHERE booking_id = ? OR (listing_id = ? AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)))
       ORDER BY updated_at DESC LIMIT 1`,
      [bookingId, booking.listing_id, booking.borrower_id, booking.owner_id, booking.owner_id, booking.borrower_id]
    );

    if (convRows.length > 0) {
      const convId = convRows[0].id;
      let msgText = "";
      if (bothConfirmed) {
        msgText = `🤝 Handover Confirmed by BOTH parties!\n"${booking.item_title}" is now actively borrowed. Please return it on time.`;
      } else if (isBorrower) {
        msgText = `📦 Borrower (${booking.borrower_name}) confirmed receiving "${booking.item_title}". Waiting for Lender (${booking.owner_name}) to confirm handover.`;
      } else {
        msgText = `📦 Lender (${booking.owner_name}) confirmed handover of "${booking.item_title}". Waiting for Borrower (${booking.borrower_name}) to confirm receipt.`;
      }
      await connection.execute(
        "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)",
        [convId, userId, msgText]
      );
      await connection.execute("UPDATE conversations SET updated_at = NOW() WHERE id = ?", [convId]);
    }

    await connection.commit();

    return res.json({
      success: true,
      message: bothConfirmed 
        ? "Both parties confirmed pickup! Item is now actively borrowed." 
        : "Pickup confirmed by you. Waiting for the other party to confirm.",
      status: newStatus,
      borrower_confirmed_pickup: newBorrowerPickup,
      lender_confirmed_pickup: newLenderPickup,
      bothConfirmed
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Confirm pickup error:", error.message);
    return res.status(500).json({ success: false, message: "Could not confirm pickup." });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================
// 6. DUAL-CONFIRMATION RETURN (CONFIRM RETURN)
// Both borrower and lender must confirm return
// ==========================================
router.post("/:id/confirm-return", requireAuth, async function (req, res) {
  let connection;
  try {
    const bookingId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT b.*, l.title AS item_title,
              u_bor.full_name AS borrower_name, u_own.full_name AS owner_name
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users u_bor ON b.borrower_id = u_bor.id
       JOIN users u_own ON b.owner_id = u_own.id
       WHERE b.id = ? FOR UPDATE`,
      [bookingId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const booking = rows[0];

    if (booking.borrower_id !== userId && booking.owner_id !== userId && req.user.role !== "admin") {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Unauthorized to confirm return for this booking." });
    }

    if (booking.status !== "active") {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Cannot confirm return for booking in '${booking.status}' status. Item must be in active status.` 
      });
    }

    const isBorrower = booking.borrower_id === userId;
    const isOwner = booking.owner_id === userId;

    let newBorrowerReturn = Boolean(booking.borrower_confirmed_return);
    let newLenderReturn = Boolean(booking.lender_confirmed_return);

    if (isBorrower) newBorrowerReturn = true;
    if (isOwner) newLenderReturn = true;

    const bothConfirmed = Boolean(newBorrowerReturn && newLenderReturn);
    const newStatus = bothConfirmed ? "completed" : "active";

    await connection.execute(
      `UPDATE bookings 
       SET borrower_confirmed_return = ?, lender_confirmed_return = ?, status = ?
       WHERE id = ?`,
      [newBorrowerReturn ? 1 : 0, newLenderReturn ? 1 : 0, newStatus, bookingId]
    );

    // If both confirmed, release the item back to approved/available status
    if (bothConfirmed) {
      await connection.execute(
        "UPDATE listings SET status = 'approved' WHERE id = ?",
        [booking.listing_id]
      );
    }

    // Post to conversation
    const [convRows] = await connection.execute(
      `SELECT id FROM conversations 
       WHERE booking_id = ? OR (listing_id = ? AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)))
       ORDER BY updated_at DESC LIMIT 1`,
      [bookingId, booking.listing_id, booking.borrower_id, booking.owner_id, booking.owner_id, booking.borrower_id]
    );

    if (convRows.length > 0) {
      const convId = convRows[0].id;
      let msgText = "";
      if (bothConfirmed) {
        msgText = `🎉 Return Confirmed by BOTH parties!\n"${booking.item_title}" has been safely returned to ${booking.owner_name}. The rental is now completed. Thank you!`;
      } else if (isBorrower) {
        msgText = `🔄 Borrower (${booking.borrower_name}) marked "${booking.item_title}" as returned. Waiting for Lender (${booking.owner_name}) to confirm receipt.`;
      } else {
        msgText = `🔄 Lender (${booking.owner_name}) confirmed receiving back "${booking.item_title}". Waiting for Borrower (${booking.borrower_name}) to confirm return.`;
      }
      await connection.execute(
        "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)",
        [convId, userId, msgText]
      );
      await connection.execute("UPDATE conversations SET updated_at = NOW() WHERE id = ?", [convId]);
    }

    await connection.commit();

    return res.json({
      success: true,
      message: bothConfirmed 
        ? "Both parties confirmed return! Rental completed." 
        : "Return confirmed by you. Waiting for the other party to confirm.",
      status: newStatus,
      borrower_confirmed_return: newBorrowerReturn,
      lender_confirmed_return: newLenderReturn,
      bothConfirmed
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Confirm return error:", error.message);
    return res.status(500).json({ success: false, message: "Could not confirm return." });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================
// 7. NEGOTIATE PRICE / DETAILS
// ==========================================
router.post("/:id/negotiate-price", requireAuth, async function (req, res) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { agreedPrice } = req.body;
    const price = parseFloat(agreedPrice);

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: "Valid agreed price is required." });
    }

    const [rows] = await db.execute("SELECT id, owner_id, borrower_id, listing_id FROM bookings WHERE id = ?", [bookingId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Booking not found." });

    const booking = rows[0];
    if (booking.owner_id !== req.user.id && booking.borrower_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    await db.execute(
      "UPDATE bookings SET agreed_price = ?, total_price = ? WHERE id = ?",
      [price, price, bookingId]
    );

    // Post to conversation
    const [convRows] = await db.execute(
      "SELECT id FROM conversations WHERE booking_id = ? LIMIT 1",
      [bookingId]
    );
    if (convRows.length > 0) {
      await db.execute(
        "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)",
        [convRows[0].id, req.user.id, `💰 Rental price updated to ₹${price} as agreed.`]
      );
    }

    return res.json({ success: true, message: `Price updated to ₹${price}.`, newPrice: price });
  } catch (err) {
    console.error("Negotiate price error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to update price." });
  }
});

module.exports = router;
