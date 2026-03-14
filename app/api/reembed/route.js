import { getAdminClient } from '@/lib/supabase';

const CANDIDATE_RPCS = [
  'reembed_memory',
  'enqueue_memory_embedding',
  'embed_memory',
  'refresh_memory_embedding',
  'reindex_memory'
];

async function tryRpc(supabase, fn, memoryId) {
  const payloads = [
    { memory_id: memoryId },
    { id: memoryId },
    { p_memory_id: memoryId }
  ];

  const failures = [];

  for (const args of payloads) {
    const { data, error } = await supabase.rpc(fn, args);
    if (!error) return { ok: true, fn, data };
    failures.push({ fn, args: Object.keys(args), message: error.message, details: error.details ?? null });
  }

  return { ok: false, failures };
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
        await supabase.from('memory_audit_log').insert({
          memory_id: id,
          action: 'reembed',
          actor: 'local-user',
          meta: { rpc: fn }
        });
        return Response.json({ ok: true, method: fn });
      }
      attempts.push(...(result.failures || []));
    }

    return Response.json(
      {
        ok: false,
        error:
          'No known re-embed RPC found. Create one of: reembed_memory, enqueue_memory_embedding, embed_memory, refresh_memory_embedding, reindex_memory.',
        attempts
      },
      { status: 400 }
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
