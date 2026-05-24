"""
Migration: add referrals table + referral_code column to users
Connects directly to Supabase Postgres via psycopg2
"""
import os
import psycopg2

# Supabase project ref from URL
supabase_url = os.environ.get("SUPABASE_URL", "")
project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")

# Supabase Postgres connection string
# Direct connection: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
# We need the DB password — it's the service role key for admin connections
# Actually Supabase uses a separate DB password, not the service role key
# Let's use the Supabase REST API with the service role key to run SQL

import urllib.request
import json

service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

sql_statements = [
    "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT",
    "CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON public.users(referral_code)",
    """CREATE TABLE IF NOT EXISTS public.referrals (
      id BIGSERIAL PRIMARY KEY,
      referrer_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      referred_email TEXT NOT NULL,
      referred_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )""",
    "CREATE UNIQUE INDEX IF NOT EXISTS referrals_referrer_email_idx ON public.referrals(referrer_user_id, referred_email)",
    "CREATE INDEX IF NOT EXISTS referrals_referred_email_idx ON public.referrals(referred_email)",
    "ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY",
    """DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referrals' AND policyname='service_role_all_referrals') THEN
        CREATE POLICY "service_role_all_referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$""",
]

# Use Supabase REST API with service role to execute SQL via the pg extension
# The Supabase REST API doesn't support raw SQL, but we can use the management API
# Let's try using the Supabase JS client via a Node.js one-liner instead

# Actually, let's use the Supabase pg REST endpoint
# The correct approach is to use the Supabase connection pooler with the service role password
# But we don't have that. Let's use the Supabase REST API's /rest/v1/rpc if we have exec_sql

# Alternative: use the Supabase Management API
# https://api.supabase.com/v1/projects/{ref}/database/query
# This requires a Supabase personal access token, not the service role key

print("Cannot run SQL directly without DB password or Supabase personal access token.")
print("\nSQL to run in Supabase Dashboard > SQL Editor:\n")
print("-- Copy and run this SQL in Supabase Dashboard SQL Editor --")
for sql in sql_statements:
    print(sql.strip() + ";")
    print()
