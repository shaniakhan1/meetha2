/**
 * Migration: add referrals table + referral_code column to users
 * Uses pg directly with the Supabase Postgres connection
 */
import pg from "pg";

const { Client } = pg;

// Supabase direct connection string
// Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
// The password is the database password (set in Supabase dashboard)
// We'll try the connection pooler format with the service role key as password
const projectRef = process.env.SUPABASE_URL
  .replace("https://", "")
  .replace(".supabase.co", "");

// Try the Supabase pooler connection
const connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase Postgres");
  } catch (err) {
    console.error("Connection failed:", err.message);
    console.log("\nSQL to run manually in Supabase Dashboard > SQL Editor:\n");
    printSQL();
    process.exit(0);
  }

  try {
    await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT`);
    console.log("✓ referral_code column");

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON public.users(referral_code)`);
    console.log("✓ users_referral_code_idx");

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.referrals (
        id BIGSERIAL PRIMARY KEY,
        referrer_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        referred_email TEXT NOT NULL,
        referred_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `);
    console.log("✓ referrals table");

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS referrals_referrer_email_idx ON public.referrals(referrer_user_id, referred_email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS referrals_referred_email_idx ON public.referrals(referred_email)`);
    console.log("✓ referrals indexes");

    await client.query(`ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY`);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referrals' AND policyname='service_role_all_referrals') THEN
          CREATE POLICY "service_role_all_referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$
    `);
    console.log("✓ RLS policy");

    await client.end();
    console.log("\nMigration complete!");
  } catch (err) {
    console.error("Migration error:", err.message);
    await client.end();
  }
}

function printSQL() {
  console.log(`
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON public.users(referral_code);

CREATE TABLE IF NOT EXISTS public.referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_referrer_email_idx ON public.referrals(referrer_user_id, referred_email);
CREATE INDEX IF NOT EXISTS referrals_referred_email_idx ON public.referrals(referred_email);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referrals' AND policyname='service_role_all_referrals') THEN
    CREATE POLICY "service_role_all_referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
  `);
}

run();
