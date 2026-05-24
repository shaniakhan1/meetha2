-- Meetha Supabase Schema
-- Run this in the Supabase SQL editor or via the service role client

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (maps to Supabase Auth users)
create table if not exists public.users (
  id bigserial primary key,
  open_id text not null unique,           -- Supabase auth.users.id (UUID as text)
  name text,
  email text,
  login_method text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_signed_in timestamptz not null default now()
);

-- Profiles table (archetype + mood)
create table if not exists public.profiles (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  archetype text not null,
  mood text not null,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Credits table
create table if not exists public.credits (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  credits_remaining integer not null default 5,
  total_used integer not null default 0,
  tier text not null default 'free' check (tier in ('free', 'starter', 'pro')),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Generations table
create table if not exists public.generations (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  image_url text not null,
  image_key text not null,
  archetype text not null,
  mood text not null,
  platform text not null,
  scene_category text,
  hooks text not null,                    -- JSON array of 3 hooks
  caption text not null,
  selected_hook text,
  created_at timestamptz not null default now()
);

-- Postability feedback table
create table if not exists public.postability_feedback (
  id bigserial primary key,
  generation_id bigint not null references public.generations(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  response text not null check (response in ('yes', 'maybe', 'no')),
  created_at timestamptz not null default now()
);

-- RLS: disable for server-side service role access (we use service role key server-side)
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.credits enable row level security;
alter table public.generations enable row level security;
alter table public.postability_feedback enable row level security;

-- Allow service role full access (server-side)
create policy "service_role_all_users" on public.users for all using (true) with check (true);
create policy "service_role_all_profiles" on public.profiles for all using (true) with check (true);
create policy "service_role_all_credits" on public.credits for all using (true) with check (true);
create policy "service_role_all_generations" on public.generations for all using (true) with check (true);
create policy "service_role_all_feedback" on public.postability_feedback for all using (true) with check (true);
