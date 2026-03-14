import { auditTableName, getAdminClient, tableName } from '@/lib/supabase';

const CANDIDATE_RPCS = [
  'reembed_memory',
  'enqueue_memory_embedding',
  'embed_memory',
  'refresh_memory_embedding',
  'reindex_memory'
];

async function tryRpc(supabase, fn, memoryId) {
  const payloads = [{ memory_id: memoryId }, { id: memoryId }, { p_memory_id: memoryId }];

  const failures = [];

  for (const args of payloads) {
    const { data, error } = await supabase.rpc(fn, args);
    if (!error) return { ok: true, fn, data };
    failures.push({ fn, args: Object.keys(args), message: error.message, details: error.details ?? null });
  }

  return { ok: false, failures };
}

function isMissingEmbeddingColumnError(error) {
  if (!error?.message) return false;
  const m = error.message.toLowerCase();
  return m.includes("column") && m.includes("embedding") && m.includes("does not exist");
}

async function directReembedFallback(supabase, memoryId) {
  const memories = tableName();
  const now = new Date().toISOString();

  // Preferred: clear embedding and touch updated_at.
  let attempt = await supabase
    .from(memories)
    .update({ embedding: null, updated_at: now })
    .eq('id', memoryId)
    .select('id')
    .maybeSingle();

  if (attempt.error && isMissingEmbeddingColumnError(attempt.error)) {
    // Fallback: only touch updated_at when there is no embedding column.
    attempt = await supabase
      .from(memories)
      .update({ updated_at: now })
      .eq('id', memoryId)
      .select('id')
      .maybeSingle();

    if (!attempt.error && attempt.data?.id != null) {
      return { ok: true, method: 'direct_updated_at_touch' };
    }
  } else if (!attempt.error && attempt.data?.id != null) {
    return { ok: true, method: 'direct_embedding_clear' };
  }

  if (!attempt.error && !attempt.data) {
    return { ok: false, error: `Memory ${memoryId} not found` };
  }

  return { ok: false, error: attempt.error?.message || 'Direct fallback failed' };
}

export async function POST(req) {
  try {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const supabase = getAdminClient();

    const attempts = [];

    for (const fn of CANDIDATE_RPCS) {
      const result = await tryRpc(supabase, fn, id);
      if (result.ok) {
        await supabase.from(auditTableName()).insert({
          memory_id: id,
          action: 'reembed',
          actor: 'local-user',
          meta: { rpc: fn }
        });
        return Response.json({ ok: true, method: fn });
      }
      attempts.push(...(result.failures || []));
    }

    const fallback = await directReembedFallback(supabase, id);
    if (fallback.ok) {
      await supabase.from(auditTableName()).insert({
        memory_id: id,
        action: 'reembed',
        actor: 'local-user',
        meta: { method: fallback.method, source: 'rpc-fallback' }
      });
      return Response.json({ ok: true, method: fallback.method, fallback: true });
    }

    return Response.json(
      {
        ok: false,
        error:
          'No known re-embed RPC found, and direct fallback failed. Create one of: reembed_memory, enqueue_memory_embedding, embed_memory, refresh_memory_embedding, reindex_memory.',
        direct_fallback_error: fallback.error,
        attempts
      },
      { status: 400 }
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
