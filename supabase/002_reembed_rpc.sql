-- Optional: adds a default re-embed RPC expected by the dashboard
-- Safe to run multiple times.
--
-- Behavior:
-- - If public.memories has an `embedding` column, sets it to NULL and bumps updated_at.
-- - Otherwise, only bumps updated_at.
-- - Returns JSON payload for debugging in dashboard/API logs.

create or replace function public.reembed_memory(memory_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  has_embedding boolean;
  touched_id bigint;
begin
  if memory_id is null or memory_id <= 0 then
    raise exception 'memory_id must be a positive bigint';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'memories'
      and column_name = 'embedding'
  ) into has_embedding;

  if has_embedding then
    execute 'update public.memories set embedding = null, updated_at = now() where id = $1 returning id'
      into touched_id
      using memory_id;
  else
    update public.memories
      set updated_at = now()
      where id = memory_id
      returning id into touched_id;
  end if;

  if touched_id is null then
    raise exception 'memory % not found', memory_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'memory_id', touched_id,
    'embedding_cleared', has_embedding,
    'method', 'reembed_memory'
  );
end;
$$;

grant execute on function public.reembed_memory(bigint) to authenticated, service_role;
