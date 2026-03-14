# OpenBrain Dashboard (single-user)

Dashboard for auditing and managing Open Brain memory entries in Supabase.

## Features
- View active or soft-deleted memory entries
- Filter by category/keyword and control result limit
- Add/Edit memories (content + category + source + importance)
- Soft delete, restore, and hard delete
- Semantic search (`match_memories` RPC if available), with keyword fallback
- Re-embed action per memory entry (tries common embedding RPC names, then falls back to direct DB update if none exist)
- Recent activity feed from `memory_audit_log`
- Edit/audit history tables (`memory_versions`, `memory_audit_log`)
- Basic server-side validation and safer API error handling

## 1) Setup

```bash
cp .env.example .env.local
# edit .env.local with your non-local Supabase URL + service role key
npm install
npm run dev
```

Open: `http://localhost:3000`

## 2) Supabase SQL (one-time)

In Supabase SQL editor, run:

1. `supabase/001_dashboard_support.sql` (base dashboard support objects)
2. `supabase/004_align_thoughts_schema.sql` (required for `public.thoughts`: aligns/backfills `content`, `created_at`, and dashboard fields)
3. `supabase/002_reembed_rpc.sql` (optional but recommended: adds a default `reembed_memory(memory_id)` RPC used by the Re-embed button)

## 3) Notes
- This app is designed for one trusted user.
- Default write target is `public.thoughts` (override with `OPENBRAIN_MEMORIES_TABLE` if needed).
- `OPENBRAIN_MEMORIES_TABLE` may be schema-qualified (for example: `openbrain.memories`).
- Audit/version writes automatically use the same schema as your memories table (`memory_audit_log` + `memory_versions` in that schema), so visibility stays consistent with other Open Brain tables.
- The API now prefers `SUPABASE_NON_LOCAL_URL` + `SUPABASE_NON_LOCAL_SERVICE_ROLE_KEY` and rejects localhost Supabase URLs unless `SUPABASE_ALLOW_LOCAL=1` is set.
- Leaving `NEXT_PUBLIC_DASHBOARD_API_BASE_URL` empty uses same-origin `/api/*` routes.
- For hosted/non-local setups, set `NEXT_PUBLIC_DASHBOARD_API_BASE_URL` to your API origin so actions like Re-embed call the correct backend.
- You can also override API origin at runtime from the dashboard **Connection** section (saved in `localStorage`), useful when testing against different remote backends without rebuilding.
- Never commit `.env.local`.

## Troubleshooting

### Error: `Could not find the 'category' column of 'thoughts' in the schema cache`

Your Supabase `thoughts` table is missing dashboard-required columns.

Run `supabase/001_dashboard_support.sql` in Supabase SQL Editor, then refresh the dashboard.

This migration is idempotent (safe to run multiple times).

### Error mentions missing `deleted_at` on `public.thoughts`

Run:

1. `supabase/001_dashboard_support.sql` (full dashboard schema)
2. If you still see the same error, run `supabase/003_fix_deleted_at.sql` (targeted repair)

Then refresh the dashboard. Both scripts are idempotent.

### Errors about missing `content` or `created_at` on `public.thoughts`

Run `supabase/004_align_thoughts_schema.sql`.

This migration adds/backfills dashboard-required columns (`content`, `created_at`, `updated_at`, `deleted_at`, etc.) and is idempotent.

## 4) Optional semantic search RPC
If your project already has a `match_memories(query_text, match_count)` RPC, the app uses it automatically.
If not, it falls back to keyword search.
