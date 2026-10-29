require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("./db");

async function migrate() {
  console.log("Starting BorrowBuddy database migration...");
  let connection;

  try {
    connection = await db.getConnection();
    console.log("Connected to MySQL database:", process.env.DB_NAME);

    // 1. Safely add columns to users table if missing
    const [existingCols] = await connection.query("DESCRIBE users");
    const colNames = existingCols.map((c) => c.Field);

    const neededCols = [
      { name: "phone", def: "VARCHAR(20) DEFAULT NULL" },
      { name: "department", def: "VARCHAR(100) DEFAULT NULL" },
      { name: "year_of_study", def: "VARCHAR(20) DEFAULT NULL" },
      { name: "bio", def: "TEXT DEFAULT NULL" },
      { name: "avatar_url", def: "VARCHAR(500) DEFAULT NULL" },
    ];

    for (const col of neededCols) {
      if (!colNames.includes(col.name)) {
        console.log(`Adding missing column '${col.name}' to users table...`);
        await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
      }
    }

    // 2. Read schema.sql and create marketplace tables
    const sqlPath = path.join(__dirname, "schema.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE TABLE IF NOT EXISTS [\s\S]*?\)(?: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci)?;/gi;
    const matches = sqlContent.match(createTableRegex) || [];

    for (const statement of matches) {
      const tableNameMatch = statement.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
      const tableName = tableNameMatch ? tableNameMatch[1] : "table";
      try {
        await connection.query(statement);
        console.log(`✓ Table verified/created: ${tableName}`);
      } catch (tableErr) {
        console.error(`Error creating table ${tableName}:`, tableErr.message);
      }
    }

    // 3. Configure Admin Identity (Roll number SM 471 / sm4721@srmist.edu.in)
    const adminEmail = (process.env.ADMIN_EMAIL || "sm4721@srmist.edu.in").trim().toLowerCase();
    const [adminResult] = await connection.execute(
      "UPDATE users SET role = 'admin' WHERE college_email = ? OR college_email LIKE 'sm47%'",
      [adminEmail]
    );

    console.log(`Admin role configuration checked for ${adminEmail}. Rows updated: ${adminResult.affectedRows}`);

    // Verify all tables in DB
    const [tables] = await connection.query("SHOW TABLES");
    console.log("All tables currently in database:");
    tables.forEach((t) => console.log(" -", Object.values(t)[0]));

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    await db.end();
  }
}

migrate();
