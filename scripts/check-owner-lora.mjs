/**
 * Check owner LoRA status and optionally run physical descriptor backfill.
 * Run: node scripts/check-owner-lora.mjs
 */
import { createConnection } from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

// First check what columns exist in profiles
const [cols] = await conn.execute(`SHOW COLUMNS FROM profiles`);
const colNames = cols.map(c => c.Field);
console.log("Profiles columns:", colNames.filter(c => c.includes("lora") || c.includes("physical")));

// Check all profiles with LoRA data
const loraStatusCol = colNames.includes("lora_status") ? "p.lora_status" : "NULL";
const loraWeightsCol = colNames.includes("lora_weights_url") ? "p.lora_weights_url" : "NULL";
const loraDescCol = colNames.includes("lora_physical_descriptors") ? "p.lora_physical_descriptors" : "NULL";
const loraReqIdCol = colNames.includes("lora_training_request_id") ? "p.lora_training_request_id" : "NULL";

const [rows] = await conn.execute(
  `SELECT p.id, u.email, u.name, ${loraStatusCol} as lora_status, ${loraWeightsCol} as lora_weights_url, ${loraDescCol} as lora_physical_descriptors, ${loraReqIdCol} as lora_training_request_id
   FROM profiles p
   JOIN users u ON u.id = p.id
   ORDER BY p.id`
);

console.log("\n=== LoRA Status Summary ===");
for (const row of rows) {
  console.log(`\nUser ${row.id} (${row.email})`);
  console.log(`  Status: ${row.lora_status}`);
  console.log(`  Weights URL: ${row.lora_weights_url ? row.lora_weights_url.slice(0, 80) + "..." : "null"}`);
  console.log(`  Physical descriptors: ${row.lora_physical_descriptors || "(none)"}`);
  console.log(`  Training request ID: ${row.lora_training_request_id || "null"}`);
}

await conn.end();
