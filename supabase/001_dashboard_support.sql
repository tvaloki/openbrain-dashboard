-- Open Brain Dashboard support objects
-- Run this once in Supabase SQL Editor

alter table if exists public.memories
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.memory_versions (
  id bigint generated always as identity primary key,
  memory_id bigint not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.memory_audit_log (
  id bigint generated always as identity primary key,
  memory_id bigint,
  action text not null,
  actor text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_memories_deleted_at on public.memories(deleted_at);
create index if not exists idx_memory_versions_memory_id on public.memory_versions(memory_id);
create index if not exists idx_memory_audit_memory_id on public.memory_audit_log(memory_id);
