import { specFor } from './components.js';

// Propagate estimated RPS from entry nodes through the graph.
// Cache nodes absorb load by hitRate; CDN absorbs by cacheHitRate.
export function propagateLoad(nodes, edges) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const outEdges = new Map();
  const inDegree = new Map();
  nodes.forEach((n) => {
    outEdges.set(n.id, []);
    inDegree.set(n.id, 0);
  });
  edges.forEach((e) => {
    if (!outEdges.has(e.source) || !nodeById.has(e.target)) return;
    outEdges.get(e.source).push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const load = new Map(nodes.map((n) => [n.id, 0]));

  nodes.forEach((n) => {
    const spec = specFor(n.type);
    if (spec?.traits?.entry) {
      const rps = Number(n.data?.config?.rps) || 0;
      load.set(n.id, (load.get(n.id) || 0) + rps);
    }
  });

  const absorbedOutgoing = (node) => {
    const cfg = node.data?.config || {};
    const l = load.get(node.id) || 0;
    if (node.type === 'cache') return l * (1 - (Number(cfg.hitRate) || 0));
    if (node.type === 'cdn') return l * (1 - (Number(cfg.cacheHitRate) || 0));
    return l;
  };

  const queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const node = nodeById.get(id);
    const outs = outEdges.get(id) || [];
    if (!outs.length) continue;
    const outgoing = absorbedOutgoing(node);
    const share = outgoing / outs.length;
    outs.forEach((t) => {
      load.set(t, (load.get(t) || 0) + share);
      const remaining = (inDegree.get(t) || 1) - 1;
      inDegree.set(t, remaining);
      if (remaining <= 0) queue.push(t);
    });
  }

  nodes.forEach((n) => {
    if (seen.has(n.id)) return;
    const outs = outEdges.get(n.id) || [];
    if (!outs.length) return;
    const share = absorbedOutgoing(n) / outs.length;
    outs.forEach((t) => load.set(t, (load.get(t) || 0) + share));
  });

  return load;
}

export function analyzeBottlenecks(nodes, edges) {
  const load = propagateLoad(nodes, edges);
  const rows = [];

  for (const n of nodes) {
    const spec = specFor(n.type);
    if (!spec) continue;
    const cfg = n.data?.config || spec.defaultConfig;
    const cap = spec.capacity(cfg);
    const used = load.get(n.id) || 0;
    const utilization = cap === Infinity ? 0 : used / cap;
    rows.push({
      id: n.id,
      type: n.type,
      label: n.data?.label || spec.label,
      category: spec.category,
      load: Math.round(used),
      capacity: cap === Infinity ? null : Math.round(cap),
      utilization: Number(utilization.toFixed(2)),
      status:
        utilization > 1 ? 'overloaded' : utilization > 0.75 ? 'hot' : utilization > 0.4 ? 'warm' : 'cool'
    });
  }

  const bottlenecks = rows
    .filter((r) => r.utilization >= 0.75)
    .sort((a, b) => b.utilization - a.utilization);

  return { load: rows, bottlenecks };
}
