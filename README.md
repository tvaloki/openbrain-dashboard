# OpenBrain Dashboard (single-user)

Local dashboard for auditing and managing Open Brain memory entries in Supabase.

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
# edit .env.local with your Supabase URL + service role key
npm install
npm run dev
```

Open: `http://localhost:3000`

## 2) Supabase SQL (one-time)

In Supabase SQL editor, run:

1. `supabase/001_dashboard_support.sql`
2. `supabase/002_reembed_rpc.sql` (optional but recommended: adds a default `reembed_memory(memory_id)` RPC used by the Re-embed button)

## 3) Notes
- This app is designed for one trusted local user (you).
- For local use, leaving `NEXT_PUBLIC_DASHBOARD_API_BASE_URL` empty uses same-origin `/api/*` routes.
- For hosted/non-local setups, set `NEXT_PUBLIC_DASHBOARD_API_BASE_URL` to your API origin so actions like Re-embed call the correct backend.
- You can also override API origin at runtime from the dashboard **Connection** section (saved in `localStorage`), useful when testing against different remote backends without rebuilding.
- Never commit `.env.local`.

## 4) Optional semantic search RPC
If your project already has a `match_memories(query_text, match_count)` RPC, the app uses it automatically.
If not, it falls back to keyword search.
