/**
 * V9 MySQL migration:
 * 1. Create signature_scene_uses table (with scene_key)
 * 2. Add share_badge_enabled to profiles
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

try {
  // Create signature_scene_uses table if it doesn't exist
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS signature_scene_uses (
      id INT AUTO_INCREMENT NOT NULL,
      user_id INT NOT NULL,
      scene_key VARCHAR(64) NOT NULL DEFAULT 'yes_to_all',
      created_at TIMESTAMP NOT NULL DEFAULT (NOW()),
      CONSTRAINT signature_scene_uses_id PRIMARY KEY (id)
    )
  `);
  console.log("✓ signature_scene_uses table created (or already exists)");
} catch (e) {
  console.error("signature_scene_uses error:", e.message);
}

try {
  // Add share_badge_enabled column to profiles if it doesn't exist
  await conn.execute(
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_badge_enabled BOOLEAN DEFAULT NULL"
  );
  console.log("✓ share_badge_enabled added to profiles (or already exists)");
} catch (e) {
  if (e.message.includes("Duplicate column")) {
    console.log("share_badge_enabled already exists");
  } else {
    console.error("share_badge_enabled error:", e.message);
  }
}

await conn.end();
console.log("Migration complete.");
