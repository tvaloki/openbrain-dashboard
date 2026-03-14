'use client';

import { useEffect, useMemo, useState } from 'react';

const box = { background: '#121a33', border: '1px solid #2a355f', borderRadius: 12, padding: 14, marginBottom: 14 };
const input = { padding: 8, borderRadius: 8, border: '1px solid #39457a', background: '#0d1430', color: '#fff' };
const btn = { padding: '8px 12px', borderRadius: 8, border: '1px solid #4962d4', background: '#1b2d80', color: '#fff', cursor: 'pointer' };

const defaultFilters = {
  includeDeleted: false,
  onlyDeleted: false,
  category: '',
  q: '',
  limit: 100
};

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMemory, setNewMemory] = useState({ content: '', category: 'manual', source: 'dashboard', importance: 2 });
  const [filters, setFilters] = useState(defaultFilters);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function requestJson(url, init) {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  function setMessage(nextStatus = '', nextError = '') {
    setStatus(nextStatus);
    setError(nextError);
  }

  async function load() {
    setLoading(true);
    setMessage('Loading memories...', '');
    try {
      const params = new URLSearchParams({
        include_deleted: String(filters.includeDeleted),
        only_deleted: String(filters.onlyDeleted),
        limit: String(filters.limit)
      });
      if (filters.category) params.set('category', filters.category);
      if (filters.q) params.set('q', filters.q);

      const [memoryData, activityData] = await Promise.all([
        requestJson(`/api/memories?${params.toString()}`),
        requestJson('/api/activity?limit=40')
      ]);

      setItems(memoryData.items || []);
      setActivity(activityData.items || []);
      setMessage('Data refreshed.', '');
    } catch (e) {
      setMessage('', e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(task, successMessage) {
    setBusy(true);
    setMessage('', '');
    try {
      await task();
      setMessage(successMessage, '');
      await load();
    } catch (e) {
      setMessage('', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function createMemory() {
    const payload = {
      content: newMemory.content,
      category: newMemory.category,
      source: newMemory.source,
      importance: newMemory.importance
    };
    if (!payload.content.trim()) return;

    await runAction(
      () =>
        requestJson('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }),
      'Memory created.'
    );

    setNewMemory((m) => ({ ...m, content: '' }));
  }

  async function updateMemory(id, patch) {
    await runAction(
      () =>
        requestJson('/api/memories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...patch })
        }),
      `Memory #${id} updated.`
    );
  }

  async function restoreMemory(id) {
    await runAction(
      () =>
        requestJson('/api/memories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: 'restore' })
        }),
      `Memory #${id} restored.`
    );
  }

  async function deleteMemory(id, hard = false) {
    const ok = confirm(hard ? `Hard delete memory #${id}? This cannot be undone.` : `Soft delete memory #${id}?`);
    if (!ok) return;

    await runAction(
      () =>
        requestJson('/api/memories', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, hard })
        }),
      hard ? `Memory #${id} hard deleted.` : `Memory #${id} soft deleted.`
    );
  }

  async function reembedMemory(id) {
    await runAction(
      async () => {
        const data = await requestJson('/api/reembed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        setMessage(`Re-embed requested via ${data.method}.`, '');
      },
      ''
    );
  }

  async function semanticSearch() {
    if (!searchQuery.trim()) {
      setMessage('', 'Search query is required.');
      return;
    }

    setLoading(true);
    setMessage('Searching...', '');
    try {
      const data = await requestJson('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, include_deleted: filters.includeDeleted || filters.onlyDeleted })
      });
      setItems(data.items || []);
      setMessage(`Search complete (${data.mode}).`, '');
    } catch (e) {
      setMessage('', e.message);
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const total = items.length;
    const deleted = items.filter((x) => x.deleted_at).length;
    return { total, deleted, active: total - deleted };
  }, [items]);

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Open Brain Dashboard</h1>
      <p style={{ color: '#9fb2ff' }}>Local single-user CRUD + audit for your memory table.</p>

      {status ? <p style={{ color: '#86efac', marginTop: 0 }}>{status}</p> : null}
      {error ? <p style={{ color: '#fca5a5', marginTop: 0 }}>{error}</p> : null}

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Quick stats</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag label={`Visible: ${summary.total}`} />
          <Tag label={`Active: ${summary.active}`} tone="green" />
          <Tag label={`Deleted: ${summary.deleted}`} tone="yellow" />
          <Tag label={`Activity events: ${activity.length}`} />
        </div>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Search</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...input, flex: 1 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Semantic/keyword search"
          />
          <button style={btn} disabled={loading || busy} onClick={semanticSearch}>
            Semantic search
          </button>
          <button style={btn} disabled={loading || busy} onClick={load}>
            Reset
          </button>
        </div>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Filters</h3>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Category</span>
            <input
              style={input}
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. decision"
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Content contains</span>
            <input
              style={input}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="keyword"
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Limit</span>
            <select style={input} value={String(filters.limit)} onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value) }))}>
              {[50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 20 }}>
            <input
              type="checkbox"
              checked={filters.includeDeleted}
              onChange={(e) => setFilters((f) => ({ ...f, includeDeleted: e.target.checked, onlyDeleted: e.target.checked ? f.onlyDeleted : false }))}
            />
            Include deleted
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 20 }}>
            <input
              type="checkbox"
              checked={filters.onlyDeleted}
              onChange={(e) => setFilters((f) => ({ ...f, onlyDeleted: e.target.checked, includeDeleted: e.target.checked || f.includeDeleted }))}
            />
            Only deleted
          </label>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn} disabled={loading || busy} onClick={load}>
            Apply filters
          </button>
          <button style={btn} disabled={loading || busy} onClick={() => { setFilters(defaultFilters); setTimeout(load, 0); }}>
            Clear filters
          </button>
        </div>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Add memory</h3>
        <textarea
          style={{ ...input, width: '100%', minHeight: 80 }}
          value={newMemory.content}
          onChange={(e) => setNewMemory((m) => ({ ...m, content: e.target.value }))}
          placeholder="Add a memory entry"
        />
        <div style={{ marginTop: 8, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <input
            style={input}
            value={newMemory.category}
            onChange={(e) => setNewMemory((m) => ({ ...m, category: e.target.value }))}
            placeholder="category"
          />
          <input
            style={input}
            value={newMemory.source}
            onChange={(e) => setNewMemory((m) => ({ ...m, source: e.target.value }))}
            placeholder="source"
          />
          <select
            style={input}
            value={String(newMemory.importance)}
            onChange={(e) => setNewMemory((m) => ({ ...m, importance: Number(e.target.value) }))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                Importance {n}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <button style={btn} disabled={loading || busy} onClick={createMemory}>
            Create
          </button>
        </div>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Entries {loading ? '(loading...)' : `(${items.length})`}</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((m) => (
            <MemoryCard
              key={m.id}
              item={m}
              disabled={loading || busy}
              onSave={updateMemory}
              onDelete={deleteMemory}
              onReembed={reembedMemory}
              onRestore={restoreMemory}
            />
          ))}
        </div>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>Recent activity</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {activity.map((a) => (
            <div key={a.id} style={{ border: '1px solid #2f3f7a', borderRadius: 8, padding: 8, fontSize: 13 }}>
              <strong style={{ color: '#dbeafe' }}>{a.action}</strong> on #{a.memory_id ?? 'n/a'}
              <span style={{ color: '#9fb2ff' }}> • {a.actor || 'system'} • {a.created_at || 'n/a'}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function MemoryCard({ item, disabled, onSave, onDelete, onReembed, onRestore }) {
  const [draft, setDraft] = useState(item.content || '');
  const [category, setCategory] = useState(item.category || 'manual');
  const [source, setSource] = useState(item.source || 'dashboard');
  const [importance, setImportance] = useState(item.importance ?? 2);

  useEffect(() => {
    setDraft(item.content || '');
    setCategory(item.category || 'manual');
    setSource(item.source || 'dashboard');
    setImportance(item.importance ?? 2);
  }, [item]);

  const deleted = Boolean(item.deleted_at);

  return (
    <div style={{ border: `1px solid ${deleted ? '#7a3f2f' : '#2f3f7a'}`, borderRadius: 10, padding: 10, background: '#0e1735' }}>
      <div style={{ fontSize: 12, color: '#a8b7e8', marginBottom: 6 }}>
        #{item.id} • created {item.created_at || 'n/a'} • updated {item.updated_at || 'n/a'}
        {deleted ? ` • deleted ${item.deleted_at}` : ''}
      </div>
      <textarea style={{ ...input, width: '100%', minHeight: 80 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div style={{ marginTop: 8, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <input style={input} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="category" />
        <input style={input} value={source} onChange={(e) => setSource(e.target.value)} placeholder="source" />
        <select style={input} value={String(importance)} onChange={(e) => setImportance(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              Importance {n}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          style={btn}
          disabled={disabled}
          onClick={() => onSave(item.id, { content: draft, category, source, importance })}
        >
          Save
        </button>
        <button style={{ ...btn, background: '#23585e', borderColor: '#39a0ab' }} disabled={disabled} onClick={() => onReembed(item.id)}>
          Re-embed
        </button>
        {deleted ? (
          <button style={{ ...btn, background: '#2c5a15', borderColor: '#7ccf4a' }} disabled={disabled} onClick={() => onRestore(item.id)}>
            Restore
          </button>
        ) : (
          <button style={{ ...btn, background: '#5a5010', borderColor: '#bca92f' }} disabled={disabled} onClick={() => onDelete(item.id, false)}>
            Soft delete
          </button>
        )}
        <button style={{ ...btn, background: '#5f1821', borderColor: '#c9485d' }} disabled={disabled} onClick={() => onDelete(item.id, true)}>
          Hard delete
        </button>
      </div>
    </div>
  );
}

function Tag({ label, tone = 'blue' }) {
  const tones = {
    blue: { bg: '#1e3a8a', border: '#3b82f6' },
    green: { bg: '#14532d', border: '#4ade80' },
    yellow: { bg: '#713f12', border: '#facc15' }
  };
  const t = tones[tone] || tones.blue;
  return (
    <span style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>
      {label}
    </span>
  );
}
