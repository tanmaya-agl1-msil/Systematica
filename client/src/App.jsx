import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Palette from './components/Palette';
import Canvas from './components/Canvas';
import MetricsPanel from './components/MetricsPanel';
import NodeConfig from './components/NodeConfig';
import { api } from './lib/api';

// Convert internal React Flow nodes -> server node shape.
function serialize(nodes, edges) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.componentType || n.data?.nodeType,
      position: n.position,
      data: { label: n.data?.label, config: n.data?.config }
    })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label }))
  };
}

function hydrate(nodes, edges) {
  return {
    nodes: (nodes || []).map((n) => ({
      id: n.id,
      type: 'arch',
      componentType: n.type,
      position: n.position || { x: 0, y: 0 },
      data: {
        label: n.data?.label || n.type,
        nodeType: n.type,
        config: n.data?.config || {}
      }
    })),
    edges: (edges || []).map((e) => ({
      id: e.id || `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true
    }))
  };
}

export default function App() {
  const [specs, setSpecs] = useState([]);          // array
  const [specsByType, setSpecsByType] = useState({}); // map
  const [provider, setProvider] = useState('aws');

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [designName, setDesignName] = useState('Untitled Design');
  const [designId, setDesignId] = useState(null);
  const [savedList, setSavedList] = useState([]);
  const [dbAvailable, setDbAvailable] = useState(false);
  const evalTimer = useRef(null);

  // Load component catalog from server.
  useEffect(() => {
    api.components().then((list) => {
      setSpecs(list);
      setSpecsByType(Object.fromEntries(list.map((s) => [s.type, s])));
    }).catch((e) => console.error('components fetch failed', e));
  }, []);

  useEffect(() => {
    clearTimeout(evalTimer.current);
    evalTimer.current = setTimeout(async () => {
      try {
        const { nodes: sn, edges: se } = serialize(nodes, edges);
        const r = await api.evaluate(sn, se);
        setReport(r);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(evalTimer.current);
  }, [nodes, edges]);

  const refreshList = useCallback(async () => {
    try {
      const list = await api.listDesigns();
      setSavedList(list);
      setDbAvailable(true);
    } catch {
      setDbAvailable(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) || null, [nodes, selectedId]);

  const updateNode = (updated) => {
    setNodes((nds) => nds.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
  };
  const deleteNode = (id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  };

  // Insert suggested components from a remediation into the canvas.
  const applyFix = (types) => {
    if (!types?.length) return;
    setNodes((nds) => {
      const maxX = nds.reduce((m, n) => Math.max(m, n.position?.x || 0), 0);
      const baseX = maxX + 220;
      const additions = types
        .map((t, i) => {
          const spec = specsByType[t];
          if (!spec) return null;
          const id = `${t}_${Date.now().toString(36)}_${i}`;
          return {
            id,
            type: 'arch',
            componentType: t,
            position: { x: baseX, y: 60 + i * 130 },
            data: {
              label: spec.label,
              nodeType: t,
              config: { ...(spec.defaultConfig || {}) }
            }
          };
        })
        .filter(Boolean);
      return [...nds, ...additions];
    });
  };

  const save = async () => {
    const payload = { name: designName, description: '', ...serialize(nodes, edges) };
    try {
      const doc = designId
        ? await api.updateDesign(designId, payload)
        : await api.saveDesign(payload);
      setDesignId(doc._id);
      await refreshList();
      alert('Saved.');
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  };

  const load = async (id) => {
    try {
      const doc = await api.getDesign(id);
      const { nodes: n, edges: eArr } = hydrate(doc.nodes, doc.edges);
      setNodes(n);
      setEdges(eArr);
      setDesignName(doc.name);
      setDesignId(doc._id);
    } catch (e) {
      alert('Load failed: ' + e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this design?')) return;
    await api.deleteDesign(id);
    if (id === designId) {
      setDesignId(null);
      setDesignName('Untitled Design');
    }
    refreshList();
  };

  const clear = () => {
    if (!confirm('Clear the canvas?')) return;
    setNodes([]);
    setEdges([]);
    setDesignId(null);
    setDesignName('Untitled Design');
  };

  const loadTemplate = () => {
    const { nodes: n, edges: e } = hydrate(SAMPLE.nodes, SAMPLE.edges);
    setNodes(n);
    setEdges(e);
    setDesignName('Reference 3-tier web');
    setDesignId(null);
  };

  return (
    <div className="app">
      <div className="topbar">
        <h1>Systematica</h1>
        <input
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <button onClick={loadTemplate}>Load sample</button>
        <button onClick={clear}>Clear</button>
        <div className="spacer" />
        <span className="status">
          Score: <b>{report?.summary?.overall ?? '-'}</b> · Cost: {report ? `$${report.summary.monthlyCost}/mo` : '-'} · {specs.length} components
        </span>
        <button
          className="primary"
          onClick={save}
          disabled={!dbAvailable}
          title={dbAvailable ? '' : 'MongoDB unavailable'}
        >
          {designId ? 'Update' : 'Save'}
        </button>
      </div>

      <Palette specs={specs} provider={provider} onProviderChange={setProvider} />

      <Canvas
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
        onSelectNode={setSelectedId}
        report={report}
        specsByType={specsByType}
        provider={provider}
      />

      <aside className="side">
        <h2>Inspector</h2>
        <NodeConfig
          node={selected}
          spec={selected ? specsByType[selected.componentType] : null}
          onChange={updateNode}
          onDelete={deleteNode}
        />

        <h2 style={{ marginTop: 16 }}>Architecture Report</h2>
        <MetricsPanel report={report} specsByType={specsByType} onApplyFix={applyFix} />

        {dbAvailable && (
          <>
            <h3>Saved designs</h3>
            {savedList.length === 0 && <div className="muted small">None yet.</div>}
            {savedList.map((d) => (
              <div key={d._id} className="card row-between">
                <div>
                  <div style={{ fontSize: 13 }}>{d.name}</div>
                  <div className="muted" style={{ fontSize: 10 }}>
                    {new Date(d.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => load(d._id)}>Open</button>
                  <button className="danger" onClick={() => remove(d._id)}>✕</button>
                </div>
              </div>
            ))}
          </>
        )}
      </aside>
    </div>
  );
}

const SAMPLE = {
  nodes: [
    { id: 'web', type: 'client_web', position: { x: 20, y: 240 }, data: { label: 'Web Users', config: { rps: 5000 } } },
    { id: 'dns', type: 'dns', position: { x: 200, y: 120 }, data: { label: 'DNS', config: { latencyRouting: true } } },
    { id: 'cdn', type: 'cdn', position: { x: 200, y: 240 }, data: { label: 'CDN', config: { regions: 12, cacheHitRate: 0.85 } } },
    { id: 'waf', type: 'waf', position: { x: 380, y: 240 }, data: { label: 'WAF', config: { rulesEnabled: 20 } } },
    { id: 'gw', type: 'api_gateway', position: { x: 560, y: 240 }, data: { label: 'API Gateway', config: { rateLimitRps: 20000, authEnabled: true } } },
    { id: 'idp', type: 'identity_provider', position: { x: 560, y: 60 }, data: { label: 'Auth', config: { users: 200000, mfa: true } } },
    { id: 'lb', type: 'load_balancer_l7', position: { x: 740, y: 240 }, data: { label: 'ALB', config: { tier: 'standard' } } },
    { id: 'api', type: 'api', position: { x: 920, y: 240 }, data: { label: 'API Service', config: { instances: 4, rpsPerInstance: 800, stateful: false, autoscale: true, multiAZ: true } } },
    { id: 'cache', type: 'cache', position: { x: 1120, y: 140 }, data: { label: 'Redis', config: { sizeGB: 16, hitRate: 0.85, replicated: true } } },
    { id: 'db', type: 'sql_db', position: { x: 1320, y: 240 }, data: { label: 'Postgres', config: { engine: 'postgres', replicas: 2, multiAZ: true, writesPerSec: 1500, readsPerSec: 8000, backups: true } } },
    { id: 'q', type: 'queue', position: { x: 1120, y: 380 }, data: { label: 'SQS', config: { throughput: 20000, dlq: true } } },
    { id: 'wk', type: 'worker', position: { x: 1320, y: 380 }, data: { label: 'Workers', config: { instances: 3, jobsPerSec: 400 } } },
    { id: 's3', type: 'object_storage', position: { x: 380, y: 380 }, data: { label: 'S3 Assets', config: { sizeGB: 500, versioning: true } } },
    { id: 'sec', type: 'secret_manager', position: { x: 920, y: 60 }, data: { label: 'Secrets', config: { secrets: 40 } } },
    { id: 'met', type: 'metrics', position: { x: 1320, y: 60 }, data: { label: 'Prometheus', config: { seriesMillions: 8 } } },
    { id: 'log', type: 'logging', position: { x: 1520, y: 120 }, data: { label: 'Logs', config: { ingestGBDay: 80 } } },
    { id: 'trc', type: 'tracing', position: { x: 1520, y: 240 }, data: { label: 'Tracing', config: { spansPerSec: 20000 } } },
    { id: 'alt', type: 'alerting', position: { x: 1520, y: 380 }, data: { label: 'PagerDuty', config: {} } }
  ],
  edges: [
    { id: 'e1', source: 'web', target: 'dns' },
    { id: 'e2', source: 'dns', target: 'cdn' },
    { id: 'e3', source: 'cdn', target: 's3' },
    { id: 'e4', source: 'cdn', target: 'waf' },
    { id: 'e5', source: 'waf', target: 'gw' },
    { id: 'e6', source: 'gw', target: 'idp' },
    { id: 'e7', source: 'gw', target: 'lb' },
    { id: 'e8', source: 'lb', target: 'api' },
    { id: 'e9', source: 'api', target: 'cache' },
    { id: 'e10', source: 'api', target: 'sec' },
    { id: 'e11', source: 'cache', target: 'db' },
    { id: 'e12', source: 'api', target: 'q' },
    { id: 'e13', source: 'q', target: 'wk' },
    { id: 'e14', source: 'wk', target: 'db' },
    { id: 'e15', source: 'api', target: 'met' },
    { id: 'e16', source: 'api', target: 'log' },
    { id: 'e17', source: 'api', target: 'trc' },
    { id: 'e18', source: 'met', target: 'alt' }
  ]
};
