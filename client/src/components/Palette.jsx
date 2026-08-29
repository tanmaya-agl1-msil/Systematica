import React, { useMemo, useState } from 'react';
import { PROVIDERS, matchesSearch, providerLabel } from '../lib/componentSpecs';

export default function Palette({ specs, provider, onProviderChange }) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const grouped = useMemo(() => {
    const filtered = specs.filter((s) => matchesSearch(s, query));
    const g = {};
    for (const s of filtered) {
      g[s.category] = g[s.category] || [];
      g[s.category].push(s);
    }
    for (const k of Object.keys(g)) g[k].sort((a, b) => a.label.localeCompare(b.label));
    return g;
  }, [specs, query]);

  const totalShown = useMemo(
    () => Object.values(grouped).reduce((s, arr) => s + arr.length, 0),
    [grouped]
  );

  const onDragStart = (e, type) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="palette">
      <div className="palette-header">
        <input
          className="search"
          placeholder={`Search ${specs.length} components…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={provider} onChange={(e) => onProviderChange(e.target.value)}>
          {PROVIDERS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="hint">
          Showing {totalShown} of {specs.length}
        </div>
      </div>

      {Object.entries(grouped).map(([cat, items]) => {
        const isCollapsed = !!collapsed[cat];
        return (
          <div key={cat} className="palette-group">
            <h3
              onClick={() => setCollapsed((c) => ({ ...c, [cat]: !isCollapsed }))}
              style={{ cursor: 'pointer' }}
            >
              <span>{isCollapsed ? '▸' : '▾'} {cat}</span>
              <span className="badge">{items.length}</span>
            </h3>
            {!isCollapsed &&
              items.map((s) => (
                <div
                  key={s.type}
                  className="item"
                  draggable
                  onDragStart={(e) => onDragStart(e, s.type)}
                  title={s.description}
                >
                  <div className="item-main">
                    <div className="item-label">{s.label}</div>
                    <div className="item-provider">{providerLabel(s, provider)}</div>
                  </div>
                  <div className="item-tags">
                    {(s.tags || []).slice(0, 2).map((t) => (
                      <span key={t} className="tag-mini">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        );
      })}

      {totalShown === 0 && <div className="empty">No components match "{query}".</div>}
    </aside>
  );
}
