// Use pg directly with the Supabase connection string
import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

// Supabase direct connection: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
// We can derive the password from the service role key or use DATABASE_URL if it's a Supabase URL
const dbUrl = process.env.DATABASE_URL;
console.log("DB URL prefix:", dbUrl?.substring(0, 40));

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const res = await client.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transformation_card_url TEXT;");
console.log("Migration result:", res.command);

// Verify
const check = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'transformation_card_url';");
console.log("Column exists:", check.rows.length > 0 ? "YES" : "NO");

await client.end();
