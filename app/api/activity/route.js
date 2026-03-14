import { auditTableName, fromTable, getAdminClient } from '@/lib/supabase';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 300;

function parseLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

export async function GET(req) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get('limit'));

    const { data, error } = await fromTable(supabase, auditTableName())
      .select('id,memory_id,action,actor,meta,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return Response.json({ items: data || [] });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
