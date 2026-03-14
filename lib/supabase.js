import { createClient } from '@supabase/supabase-js';

function isLocalSupabaseUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function getAdminClient() {
  const url = process.env.SUPABASE_NON_LOCAL_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_NON_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_NON_LOCAL_URL and SUPABASE_NON_LOCAL_SERVICE_ROLE_KEY (or SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  if (isLocalSupabaseUrl(url) && process.env.SUPABASE_ALLOW_LOCAL !== '1') {
    throw new Error('Refusing local Supabase URL. Point dashboard at a non-local Supabase project or set SUPABASE_ALLOW_LOCAL=1 to override.');
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

function normalizeIdentifier(identifier = '') {
  return String(identifier || '')
    .trim()
    .replace(/^"|"$/g, '');
}

function parseQualifiedTable(identifier, fallbackSchema = 'public') {
  const raw = normalizeIdentifier(identifier);
  if (!raw) return { schema: fallbackSchema, table: '' };

  const parts = raw.split('.').map((x) => normalizeIdentifier(x));
  if (parts.length === 1) return { schema: fallbackSchema, table: parts[0] };

  return {
    schema: parts[0] || fallbackSchema,
    table: parts[1] || ''
  };
}

export function tableName() {
  return process.env.OPENBRAIN_MEMORIES_TABLE || 'public.thoughts';
}

export function companionTableName(baseName) {
  const { schema } = parseQualifiedTable(tableName());
  return schema && schema !== 'public' ? `${schema}.${baseName}` : baseName;
}

export function auditTableName() {
  return companionTableName('memory_audit_log');
}

export function versionsTableName() {
  return companionTableName('memory_versions');
}
