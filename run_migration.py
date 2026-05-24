import requests
import json

SUPABASE_URL = "https://tqikjsxesdtrdzoaiomh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaWtqc3hlc2R0cmR6b2Fpb21oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY0NTIwNiwiZXhwIjoyMDk1MjIxMjA2fQ.XKasw4ba45VJn6nqQCsI-vB90yjn4TxMIKtZdhroRGM"

# Run SQL statements one by one via the Supabase REST API
# We'll use the pg endpoint via the management API

statements = [
    "create extension if not exists \"uuid-ossp\"",
    """create table if not exists public.users (
  id bigserial primary key,
  open_id text not null unique,
  name text,
  email text,
  login_method text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_signed_in timestamptz not null default now()
)""",
    """create table if not exists public.profiles (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  archetype text not null,
  mood text not null,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
)""",
    """create table if not exists public.credits (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  credits_remaining integer not null default 5,
  total_used integer not null default 0,
  tier text not null default 'free' check (tier in ('free', 'starter', 'pro')),
  updated_at timestamptz not null default now(),
  unique(user_id)
)""",
    """create table if not exists public.generations (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  image_url text not null,
  image_key text not null,
  archetype text not null,
  mood text not null,
  platform text not null,
  scene_category text,
  hooks text not null,
  caption text not null,
  selected_hook text,
  created_at timestamptz not null default now()
)""",
    """create table if not exists public.postability_feedback (
  id bigserial primary key,
  generation_id bigint not null references public.generations(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  response text not null check (response in ('yes', 'maybe', 'no')),
  created_at timestamptz not null default now()
)""",
    "alter table public.users enable row level security",
    "alter table public.profiles enable row level security",
    "alter table public.credits enable row level security",
    "alter table public.generations enable row level security",
    "alter table public.postability_feedback enable row level security",
    "drop policy if exists service_role_all_users on public.users",
    "drop policy if exists service_role_all_profiles on public.profiles",
    "drop policy if exists service_role_all_credits on public.credits",
    "drop policy if exists service_role_all_generations on public.generations",
    "drop policy if exists service_role_all_feedback on public.postability_feedback",
    "create policy service_role_all_users on public.users for all using (true) with check (true)",
    "create policy service_role_all_profiles on public.profiles for all using (true) with check (true)",
    "create policy service_role_all_credits on public.credits for all using (true) with check (true)",
    "create policy service_role_all_generations on public.generations for all using (true) with check (true)",
    "create policy service_role_all_feedback on public.postability_feedback for all using (true) with check (true)",
]

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Use the Supabase SQL execution via the REST API rpc
# We need to create a helper function first, then use it
# Actually, let's use the direct DB connection via the supabase python client
from supabase import create_client
sb = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

for stmt in statements:
    try:
        result = sb.rpc("exec", {"sql": stmt}).execute()
        print(f"OK: {stmt[:60]}...")
    except Exception as e:
        # Try direct approach
        print(f"RPC failed, trying direct: {str(e)[:100]}")
        # The Supabase client doesn't expose raw SQL easily
        # We'll use the Management API
        ref = "tqikjsxesdtrdzoaiomh"
        mgmt_url = f"https://api.supabase.com/v1/projects/{ref}/database/query"
        # This requires a personal access token, not service role
        print(f"SKIP (need management API token): {stmt[:60]}")
