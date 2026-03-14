-- Align public.thoughts with the dashboard's expected memory schema
-- Safe to run multiple times (idempotent)
--
-- Expected core columns used by the dashboard APIs/UI:
--   id, content, category, source, importance, created_at, updated_at, deleted_at

-- 1) Add/repair required columns
alter table if exists public.thoughts
  add column if not exists content text;

alter table if exists public.thoughts
  add column if not exists category text default 'manual';

alter table if exists public.thoughts
  add column if not exists source text default 'dashboard';

alter table if exists public.thoughts
  add column if not exists importance integer default 2;

alter table if exists public.thoughts
  add column if not exists created_at timestamptz default now();

alter table if exists public.thoughts
  add column if not exists updated_at timestamptz default now();

alter table if exists public.thoughts
  add column if not exists deleted_at timestamptz;

-- 2) Backfill content from common legacy text columns if available
-- Priority: thought -> text -> body
-- (only fills rows where content is null/blank)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'thoughts'
      and column_name = 'thought'
  ) then
    execute $sql$
      update public.thoughts
      set content = thought
      where coalesce(trim(content), '') = ''
        and coalesce(trim(thought), '') <> ''
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'thoughts'
      and column_name = 'text'
  ) then
    execute $sql$
      update public.thoughts
      set content = "text"
      where coalesce(trim(content), '') = ''
        and coalesce(trim("text"), '') <> ''
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'thoughts'
      and column_name = 'body'
  ) then
    execute $sql$
      update public.thoughts
      set content = body
      where coalesce(trim(content), '') = ''
        and coalesce(trim(body), '') <> ''
    $sql$;
  end if;
end
$$;

-- 3) Ensure updated_at auto-touches on update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_thoughts_set_updated_at on public.thoughts;
create trigger trg_thoughts_set_updated_at
before update on public.thoughts
for each row
execute function public.set_updated_at();

-- 4) Constraints/indexes expected by dashboard filtering/sorting
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
      add constraint thoughts_importance_check
      check (importance between 1 and 5);
  end if;
end
$$;

create index if not exists idx_thoughts_created_at on public.thoughts(created_at desc);
create index if not exists idx_thoughts_deleted_at on public.thoughts(deleted_at);
create index if not exists idx_thoughts_category on public.thoughts(category);
create index if not exists idx_thoughts_updated_at on public.thoughts(updated_at desc);
