const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === "false" ? undefined : { rejectUnauthorized: false }
  };
} else {
  const isRemote = process.env.DB_HOST && process.env.DB_HOST !== "localhost" && process.env.DB_HOST !== "127.0.0.1";
  poolConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "borrowbuddy",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ...(process.env.DB_SSL === "true" || isRemote
      ? { ssl: { rejectUnauthorized: false } }
      : {})
  };
}

const db = mysql.createPool(poolConfig);

module.exports = db;
