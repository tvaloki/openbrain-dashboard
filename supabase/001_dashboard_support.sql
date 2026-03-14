-- Open Brain Dashboard support objects
-- Run this once in Supabase SQL Editor

alter table if exists public.thoughts
  add column if not exists category text default 'manual';

alter table if exists public.thoughts
  add column if not exists source text default 'dashboard';

alter table if exists public.thoughts
  add column if not exists importance integer default 2;

alter table if exists public.thoughts
  add column if not exists deleted_at timestamptz;

alter table if exists public.thoughts
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

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'thoughts'
      and column_name = 'importance'
  ) then
    alter table public.thoughts
      drop constraint if exists thoughts_importance_check;

    alter table public.thoughts
      add constraint thoughts_importance_check check (importance between 1 and 5);
  end if;
end
$$;

create index if not exists idx_thoughts_deleted_at on public.thoughts(deleted_at);
create index if not exists idx_thoughts_category on public.thoughts(category);
create index if not exists idx_memory_versions_memory_id on public.memory_versions(memory_id);
create index if not exists idx_memory_audit_memory_id on public.memory_audit_log(memory_id);
