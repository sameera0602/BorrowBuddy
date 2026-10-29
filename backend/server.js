require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./auth");
const listingsRoutes = require("./routes/listings");
const bookingsRoutes = require("./routes/bookings");
const chatsRoutes = require("./routes/chats");
const helpRoutes = require("./routes/help");
const adminRoutes = require("./routes/admin");
const profileRoutes = require("./routes/profile");
const reportsRoutes = require("./routes/reports");

const app = express();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS setup
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({
  origin: frontendOrigin,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos statically
app.use("/uploads", express.static(uploadsDir));

// Route groups
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/reports", reportsRoutes);

// Base & Health check
app.get("/", function (req, res) {
  res.send("BorrowBuddy backend is running!");
});

app.get("/api/health", function (req, res) {
  res.json({
    success: true,
    message: "BorrowBuddy server is working!",
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(function (err, req, res, next) {
  console.error("Unhandled error:", err);
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }
  return res.status(500).json({
    success: false,
    message: err.message || "An unexpected server error occurred."
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, function () {
  console.log("BorrowBuddy server running on port " + PORT);
});
