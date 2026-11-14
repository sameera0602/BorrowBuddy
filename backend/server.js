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
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      (process.env.NODE_ENV !== "production" && origin.includes("localhost"))
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
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
app.get("/api/health", function (req, res) {
  res.json({
    success: true,
    message: "BorrowBuddy server is working!",
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if available (supports unified single-server & PWA hosting)
const frontendDistPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
      const indexPath = path.join(frontendDistPath, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });
} else {
  app.get("/", function (req, res) {
    res.send("BorrowBuddy backend is running!");
  });
}

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
