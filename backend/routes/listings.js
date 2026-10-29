const express = require("express");
const fs = require("fs");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// ==========================================
// 1. GET ALL APPROVED LISTINGS (MARKETPLACE)
// ==========================================
router.get("/", async function (req, res) {
  try {
    const { category, condition, minPrice, maxPrice, search, availableOnly } = req.query;

    let query = `
      SELECT 
        l.id, l.owner_id, l.title, l.category, l.description, l.item_condition,
        l.rental_price_per_day, l.deposit_amount, l.pickup_location, l.rules,
        l.status, l.created_at,
        u.full_name AS owner_name, u.college_email AS owner_email, u.department AS owner_department
      FROM listings l
      JOIN users u ON l.owner_id = u.id
      WHERE l.status = 'approved'
    `;
    const params = [];

    if (category && category !== "All") {
      query += " AND l.category = ?";
      params.push(category);
    }

    if (condition && condition !== "all") {
      query += " AND l.item_condition = ?";
      params.push(condition);
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      query += " AND l.rental_price_per_day >= ?";
      params.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      query += " AND l.rental_price_per_day <= ?";
      params.push(Number(maxPrice));
    }

    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      query += " AND (l.title LIKE ? OR l.description LIKE ? OR l.pickup_location LIKE ?)";
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY l.created_at DESC LIMIT 100";

    const [listings] = await db.execute(query, params);

    // Fetch images for listings
    if (listings.length > 0) {
      const listingIds = listings.map((l) => l.id);
      const placeholders = listingIds.map(() => "?").join(",");
      const [images] = await db.query(
        `SELECT id, listing_id, image_url, is_primary FROM listing_images WHERE listing_id IN (${placeholders})`,
        listingIds
      );

      const imagesByListing = {};
      images.forEach((img) => {
        if (!imagesByListing[img.listing_id]) imagesByListing[img.listing_id] = [];
        imagesByListing[img.listing_id].push(img.image_url);
      });

      listings.forEach((l) => {
        l.images = imagesByListing[l.id] || [];
        l.primary_image = l.images[0] || null;
      });
    }

    return res.json({
      success: true,
      listings
    });
  } catch (error) {
    console.error("Fetch listings error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not fetch listings."
    });
  }
});

// ==========================================
// 2. GET SINGLE LISTING DETAILS
// ==========================================
router.get("/:id", async function (req, res) {
  try {
    const listingId = parseInt(req.params.id, 10);
    if (isNaN(listingId)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const [rows] = await db.execute(
      `SELECT 
        l.id, l.owner_id, l.title, l.category, l.description, l.item_condition,
        l.rental_price_per_day, l.deposit_amount, l.pickup_location, l.rules,
        l.status, l.rejection_reason, l.created_at,
        u.full_name AS owner_name, u.college_email AS owner_email, u.department AS owner_department, u.year_of_study AS owner_year
       FROM listings l
       JOIN users u ON l.owner_id = u.id
       WHERE l.id = ?
       LIMIT 1`,
      [listingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    const listing = rows[0];

    // Fetch images
    const [images] = await db.execute(
      `SELECT id, image_url, is_primary FROM listing_images WHERE listing_id = ? ORDER BY is_primary DESC, id ASC`,
      [listingId]
    );
    listing.images = images.map((img) => img.image_url);

    // Fetch already confirmed bookings for date blocking in calendar
    const [bookedDates] = await db.execute(
      `SELECT start_date, end_date FROM bookings WHERE listing_id = ? AND status IN ('accepted', 'active')`,
      [listingId]
    );
    listing.booked_ranges = bookedDates;

    return res.json({
      success: true,
      listing
    });
  } catch (error) {
    console.error("Get listing details error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load listing." });
  }
});

// Helper to remove uploaded files if validation or insertion fails
function cleanUploadedFiles(files) {
  if (files && files.length > 0) {
    for (const file of files) {
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
    }
  }
}

// ==========================================
// 3. CREATE NEW LISTING (SHARE SOMETHING)
// ==========================================
router.post("/", requireAuth, upload.array("images", 5), async function (req, res) {
  let connection;
  try {
    const {
      title,
      category,
      description,
      itemCondition,
      rentalPricePerDay,
      depositAmount,
      pickupLocation,
      rules
    } = req.body;

    // Validate fields
    const cleanTitle = String(title || "").trim();
    const cleanCat = String(category || "").trim();
    const cleanDesc = String(description || "").trim();
    const cleanCond = String(itemCondition || "good").trim();
    const cleanLoc = String(pickupLocation || "").trim();
    const price = parseFloat(rentalPricePerDay);
    const deposit = parseFloat(depositAmount || "0");

    if (cleanTitle.length < 2 || cleanTitle.length > 150) {
      cleanUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "Title must be between 2 and 150 characters." });
    }
    if (!cleanCat) {
      cleanUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "Please select a category." });
    }
    if (cleanDesc.length < 2) {
      cleanUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "Please provide a description (min 2 characters)." });
    }
    if (isNaN(price) || price < 0) {
      cleanUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "Please provide a valid rental charge per day." });
    }
    if (!cleanLoc) {
      cleanUploadedFiles(req.files);
      return res.status(400).json({ success: false, message: "Please specify a pickup location on or near campus." });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Please upload at least one photo of the item." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Insert listing with status 'pending'
    const [result] = await connection.execute(
      `INSERT INTO listings 
       (owner_id, title, category, description, item_condition, rental_price_per_day, deposit_amount, pickup_location, rules, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        cleanTitle,
        cleanCat,
        cleanDesc,
        cleanCond,
        price,
        isNaN(deposit) ? 0 : deposit,
        cleanLoc,
        rules ? String(rules).trim() : null
      ]
    );

    const listingId = result.insertId;

    // Insert image records
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const imageUrl = `/uploads/${file.filename}`;
      const isPrimary = i === 0 ? 1 : 0;

      await connection.execute(
        `INSERT INTO listing_images (listing_id, image_url, is_primary) VALUES (?, ?, ?)`,
        [listingId, imageUrl, isPrimary]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Listing submitted successfully! It is now pending admin approval before appearing in the marketplace.",
      listingId
    });
  } catch (error) {
    if (connection) await connection.rollback();
    cleanUploadedFiles(req.files);
    console.error("Create listing error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not create listing: " + error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================
// 4. DELETE / WITHDRAW LISTING
// ==========================================
router.delete("/:id", requireAuth, async function (req, res) {
  try {
    const listingId = parseInt(req.params.id, 10);
    if (isNaN(listingId)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    // Verify ownership
    const [rows] = await db.execute("SELECT id, owner_id, status FROM listings WHERE id = ?", [listingId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    if (rows[0].owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this listing." });
    }

    // Check if there are active bookings
    const [activeBookings] = await db.execute(
      "SELECT id FROM bookings WHERE listing_id = ? AND status IN ('accepted', 'active')",
      [listingId]
    );
    if (activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a listing that has active or confirmed bookings."
      });
    }

    await db.execute("DELETE FROM listings WHERE id = ?", [listingId]);

    return res.json({
      success: true,
      message: "Listing withdrawn successfully."
    });
  } catch (error) {
    console.error("Delete listing error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete listing." });
  }
});

module.exports = router;
