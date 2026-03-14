import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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
  return process.env.OPENBRAIN_MEMORIES_TABLE || 'memories';
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
