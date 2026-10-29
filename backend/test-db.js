
require("dotenv").config();

const db = require("./db");

async function testConnection() {
  try {
    const connection = await db.getConnection();

    console.log("BorrowBuddy connected to MySQL successfully!");

    const [tables] = await connection.query("SHOW TABLES");

    console.log("Tables found:", tables);

    connection.release();
    await db.end();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exitCode = 1;
  }
}

testConnection();
