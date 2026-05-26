/**
 * One-time migration: add transformation_card_url column to profiles table.
 * Run with: node scripts/apply-migration-0007.mjs
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);
try {
  const [rows] = await conn.execute(
    "SHOW COLUMNS FROM `profiles` LIKE 'transformation_card_url'"
  );
  if (rows.length > 0) {
    console.log("✓ Column transformation_card_url already exists — no action needed.");
  } else {
    await conn.execute(
      "ALTER TABLE `profiles` ADD COLUMN `transformation_card_url` text"
    );
    console.log("✓ Column transformation_card_url added successfully.");
  }
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await conn.end();
}
