import { getAdminClient, tableName } from '@/lib/supabase';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function parseLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(n));
}

function parseBool(value, fallback = false) {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function cleanText(value, { max = 20000, trim = true } = {}) {
  if (typeof value !== 'string') return '';
  const v = trim ? value.trim() : value;
  return v.slice(0, max);
}

export async function GET(req) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(req.url);

    const includeDeleted = parseBool(searchParams.get('include_deleted'), false);
    const onlyDeleted = parseBool(searchParams.get('only_deleted'), false);
    const limit = parseLimit(searchParams.get('limit'));
    const category = cleanText(searchParams.get('category') || '', { max: 100 });
    const q = cleanText(searchParams.get('q') || '', { max: 200 });

    let query = supabase.from(tableName()).select('*');

    if (onlyDeleted) {
      query = query.not('deleted_at', 'is', null);
    } else if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (q) {
      query = query.ilike('content', `%${q}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

    if (error) throw error;
    return Response.json({
      items: data || [],
      filters: { includeDeleted, onlyDeleted, limit, category: category || null, q: q || null }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { content, category = 'manual', importance = 2, source = 'dashboard' } = await req.json();

    const cleanContent = cleanText(content);
    if (!cleanContent) {
      return Response.json({ error: 'content is required' }, { status: 400 });
    }

    const importanceNum = Number(importance);
    const safeImportance = Number.isFinite(importanceNum) ? Math.min(5, Math.max(1, Math.floor(importanceNum))) : 2;

    const supabase = getAdminClient();
    const row = {
      content: cleanContent,
      category: cleanText(category, { max: 100 }) || 'manual',
      importance: safeImportance,
      source: cleanText(source, { max: 100 }) || 'dashboard'
    };

    const { data, error } = await supabase.from(tableName()).insert(row).select('*').single();
    if (error) throw error;

    await supabase.from('memory_audit_log').insert({ memory_id: data.id, action: 'create', actor: 'local-user' });

    return Response.json({ item: data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const id = toId(body.id);
    if (!id) return Response.json({ error: 'valid id is required' }, { status: 400 });

    const supabase = getAdminClient();

    const { data: before, error: beforeError } = await supabase.from(tableName()).select('*').eq('id', id).single();
    if (beforeError) throw beforeError;

    const action = body.action || 'update';

    if (action === 'restore') {
      const { data, error } = await supabase
        .from(tableName())
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      await supabase.from('memory_versions').insert({ memory_id: id, before_data: before, after_data: data, action: 'restore' });
      await supabase.from('memory_audit_log').insert({ memory_id: id, action: 'restore', actor: 'local-user' });

      return Response.json({ item: data });
    }

    const content = cleanText(body.content);
    if (!content) return Response.json({ error: 'content is required' }, { status: 400 });

    const patch = {
      content,
      updated_at: new Date().toISOString()
    };

    if (body.category !== undefined) {
      patch.category = cleanText(body.category, { max: 100 }) || before.category || 'manual';
    }

    if (body.source !== undefined) {
      patch.source = cleanText(body.source, { max: 100 }) || before.source || 'dashboard';
    }

    if (body.importance !== undefined) {
      const importanceNum = Number(body.importance);
      patch.importance = Number.isFinite(importanceNum) ? Math.min(5, Math.max(1, Math.floor(importanceNum))) : before.importance ?? 2;
    }

    const { data, error } = await supabase.from(tableName()).update(patch).eq('id', id).select('*').single();
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
    const validId = toId(id);
    if (!validId) return Response.json({ error: 'valid id is required' }, { status: 400 });

    const supabase = getAdminClient();

    if (hard) {
      const { error } = await supabase.from(tableName()).delete().eq('id', validId);
      if (error) throw error;
      await supabase.from('memory_audit_log').insert({ memory_id: validId, action: 'hard_delete', actor: 'local-user' });
      return Response.json({ ok: true });
    }

    const { error } = await supabase
      .from(tableName())
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', validId);
    if (error) throw error;
    await supabase.from('memory_audit_log').insert({ memory_id: validId, action: 'soft_delete', actor: 'local-user' });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
