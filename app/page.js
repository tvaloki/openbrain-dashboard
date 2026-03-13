'use client';

import { useEffect, useState } from 'react';

const box = { background: '#121a33', border: '1px solid #2a355f', borderRadius: 12, padding: 14, marginBottom: 14 };
const input = { padding: 8, borderRadius: 8, border: '1px solid #39457a', background: '#0d1430', color: '#fff' };
const btn = { padding: '8px 12px', borderRadius: 8, border: '1px solid #4962d4', background: '#1b2d80', color: '#fff', cursor: 'pointer' };

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/memories');
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createMemory() {
    if (!newContent.trim()) return;
    await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent })
    });
    setNewContent('');
    await load();
  }

  async function updateMemory(id, content) {
    await fetch('/api/memories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content })
    });
    await load();
  }

  async function deleteMemory(id, hard = false) {
    const ok = confirm(hard ? 'Type OK in your head and confirm hard delete.' : 'Soft delete this memory?');
    if (!ok) return;
    await fetch('/api/memories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hard })
    });
    await load();
  }

  async function search() {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    });
    const data = await res.json();
    setItems(data.items || []);
  }

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Open Brain Dashboard</h1>
      <p style={{ color: '#9fb2ff' }}>Local single-user CRUD + audit for your memory table.</p>

      <section style={box}>
        <h3>Search</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...input, flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Semantic/keyword search" />
          <button style={btn} onClick={search}>Search</button>
          <button style={btn} onClick={load}>Reset</button>
        </div>
      </section>

      <section style={box}>
        <h3>Add memory</h3>
        <textarea style={{ ...input, width: '100%', minHeight: 80 }} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Add a memory entry" />
        <div style={{ marginTop: 8 }}><button style={btn} onClick={createMemory}>Create</button></div>
      </section>

      <section style={box}>
        <h3>Entries {loading ? '(loading...)' : `(${items.length})`}</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((m) => (
            <MemoryCard key={m.id} item={m} onSave={updateMemory} onDelete={deleteMemory} />
          ))}
        </div>
      </section>
    </main>
  );
}

function MemoryCard({ item, onSave, onDelete }) {
  const [draft, setDraft] = useState(item.content || '');
  return (
    <div style={{ border: '1px solid #2f3f7a', borderRadius: 10, padding: 10, background: '#0e1735' }}>
      <div style={{ fontSize: 12, color: '#a8b7e8', marginBottom: 6 }}>
        #{item.id} • {item.created_at || 'n/a'} • {item.category || 'uncategorized'} • importance {item.importance ?? 'n/a'}
      </div>
      <textarea style={{ ...input, width: '100%', minHeight: 80 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button style={btn} onClick={() => onSave(item.id, draft)}>Save</button>
        <button style={{ ...btn, background: '#5a5010', borderColor: '#bca92f' }} onClick={() => onDelete(item.id, false)}>Soft delete</button>
        <button style={{ ...btn, background: '#5f1821', borderColor: '#c9485d' }} onClick={() => onDelete(item.id, true)}>Hard delete</button>
      </div>
    </div>
  );
}
