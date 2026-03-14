import { getAdminClient, tableName } from '@/lib/supabase';

function cleanText(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export async function POST(req) {
  try {
    const { query, include_deleted = false } = await req.json();
    const q = cleanText(query, 200);
    if (!q) return Response.json({ error: 'query is required' }, { status: 400 });

    const supabase = getAdminClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc('match_memories', {
      query_text: q,
      match_count: 50
    });

    if (!rpcError && Array.isArray(rpcData)) {
      const filtered = include_deleted ? rpcData : rpcData.filter((x) => x.deleted_at == null);
      return Response.json({ items: filtered, mode: 'semantic' });
    }

    let fallback = supabase
      .from(tableName())
      .select('*')
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!include_deleted) {
      fallback = fallback.is('deleted_at', null);
    }

    const { data, error } = await fallback;

    if (error) throw error;
    return Response.json({ items: data || [], mode: 'keyword_fallback' });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
