import { getAdminClient, tableName } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from(tableName())
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return Response.json({ items: data || [] });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { content, category = 'manual', importance = 2, source = 'dashboard' } = await req.json();
    const supabase = getAdminClient();
    const row = { content, category, importance, source };
    const { data, error } = await supabase.from(tableName()).insert(row).select('*').single();
    if (error) throw error;
    return Response.json({ item: data });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { id, content } = await req.json();
    const supabase = getAdminClient();

    const { data: before } = await supabase.from(tableName()).select('*').eq('id', id).single();

    const { data, error } = await supabase
      .from(tableName())
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    await supabase.from('memory_versions').insert({ memory_id: id, before_data: before, after_data: data, action: 'update' });
    await supabase.from('memory_audit_log').insert({ memory_id: id, action: 'update', actor: 'local-user' });

    return Response.json({ item: data });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id, hard = false } = await req.json();
    const supabase = getAdminClient();

    if (hard) {
      const { error } = await supabase.from(tableName()).delete().eq('id', id);
      if (error) throw error;
      await supabase.from('memory_audit_log').insert({ memory_id: id, action: 'hard_delete', actor: 'local-user' });
      return Response.json({ ok: true });
    }

    const { error } = await supabase
      .from(tableName())
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await supabase.from('memory_audit_log').insert({ memory_id: id, action: 'soft_delete', actor: 'local-user' });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
