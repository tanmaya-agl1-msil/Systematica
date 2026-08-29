import React from 'react';
import { PROVIDERS, providerLabel } from '../lib/componentSpecs';

export default function NodeConfig({ node, spec, onChange, onDelete }) {
  if (!node) {
    return (
      <div className="card muted">
        Select a node to edit its configuration.
      </div>
    );
  }
  if (!spec) {
    return <div className="card muted">Unknown component type: {node.componentType}</div>;
  }

  const config = node.data?.config || {};
  const update = (key, value) => {
    onChange({
      ...node,
      data: { ...node.data, config: { ...config, [key]: value } }
    });
  };

  return (
    <div className="card">
      <div className="node-heading">
        <div className="node-heading-label">{spec.label}</div>
        <div className="node-heading-tags">
          {(spec.tags || []).slice(0, 3).map((t) => (
            <span key={t} className="tag-mini">{t}</span>
          ))}
        </div>
      </div>
      <div className="muted small" style={{ marginBottom: 8 }}>{spec.description}</div>

      <div className="provider-strip">
        {PROVIDERS.map((p) => (
          <div key={p.key} className="prov-cell">
            <div className="prov-label">{p.label}</div>
            <div className="prov-value" title={providerLabel(spec, p.key)}>
              {providerLabel(spec, p.key)}
            </div>
          </div>
        ))}
      </div>

      <div className="form-row">
        <label>Display label</label>
        <input
          value={node.data?.label || ''}
          onChange={(e) => onChange({ ...node, data: { ...node.data, label: e.target.value } })}
        />
      </div>

      {(spec.tunables || []).map((f) => (
        <div className="form-row" key={f.key}>
          <label>{f.label}</label>
          {f.type === 'select' ? (
            <select value={config[f.key] ?? ''} onChange={(e) => update(f.key, e.target.value)}>
              {(f.options || []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : f.type === 'boolean' ? (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={!!config[f.key]}
                onChange={(e) => update(f.key, e.target.checked)}
              />
              <span>{config[f.key] ? 'enabled' : 'disabled'}</span>
            </label>
          ) : (
            <input
              type="number"
              step={f.step || 1}
              min={f.min}
              max={f.max}
              value={config[f.key] ?? 0}
              onChange={(e) => update(f.key, Number(e.target.value))}
            />
          )}
        </div>
      ))}
      <button className="danger" onClick={() => onDelete(node.id)} style={{ marginTop: 8 }}>
        Delete node
      </button>
    </div>
  );
}
