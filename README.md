# OpenBrain Dashboard (single-user)

Local dashboard for auditing and managing Open Brain memory entries in Supabase.

## Features
- View memory entries
- Add/Edit/Delete entries
- Soft delete + hard delete
- Semantic search (`match_memories` RPC if available)
- Re-embed action per memory entry (tries common embedding RPC names)
- Edit/audit history tables (`memory_versions`, `memory_audit_log`)

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

`supabase/001_dashboard_support.sql`

## 3) Notes
- This app is designed for one trusted local user (you).
- Keep it on localhost.
- Never commit `.env.local`.

## 4) Optional semantic search RPC
If your project already has a `match_memories(query_text, match_count)` RPC, the app uses it automatically.
If not, it falls back to keyword search.
