-- Repair migration: ensure soft-delete support exists on thoughts
-- Safe to run multiple times

alter table if exists public.thoughts
  add column if not exists deleted_at timestamptz;

create index if not exists idx_thoughts_deleted_at on public.thoughts(deleted_at);
