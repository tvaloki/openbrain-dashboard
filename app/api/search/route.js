import { getAdminClient, tableName } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { query } = await req.json();
    const supabase = getAdminClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc('match_memories', {
      query_text: query,
      match_count: 50
    });

    if (!rpcError && Array.isArray(rpcData)) {
      return Response.json({ items: rpcData });
    }

    const { data, error } = await supabase
      .from(tableName())
      .select('*')
      .ilike('content', `%${query}%`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return Response.json({ items: data || [], mode: 'keyword_fallback' });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
