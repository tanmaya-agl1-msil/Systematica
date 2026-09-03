import { MarkerType } from 'reactflow';

// Tier ranks along the request/data path. Lower = closer to the user.
// Used to decide where an inline component (WAF, CDN, LB, Cache…) splices in.
const TIER_RANK = {
  client_web: 0, client_mobile: 0, client_iot: 0, client_batch: 0, client_partner: 0,
  dns: 5,
  global_accelerator: 8,
  ddos_protection: 10,
  cdn: 15,
  waf: 20,
  api_gateway: 25,
  load_balancer_l7: 30, load_balancer_l4: 30,
  service_mesh: 35,
  api: 40, paas_web: 40, serverless_fn: 40, container_orchestrator: 40, vm: 40, edge_function: 40,
  cache: 50,
  queue: 52, stream: 52, event_bus: 52, mq_broker: 52, workflow: 52,
  worker: 55,
  sql_db: 60, nosql_db: 60, distributed_sql: 60, wide_column_db: 60,
  graph_db: 60, search_engine: 60, vector_db: 60,
  data_warehouse: 70, data_lake: 70
};

// Placement strategy per suggested component type.
//   inline  – splice into an existing edge based on TIER_RANK
//   branch  – attach from a `from` node and (optionally) toward a `to` node
//   sink    – terminal: attach from the best available `from` node
//   entry   – attach toward the best available `to` node (traffic source)
const WIRING = {
  ddos_protection: { strategy: 'inline' },
  cdn: { strategy: 'inline' },
  waf: { strategy: 'inline' },
  api_gateway: { strategy: 'inline' },
  load_balancer_l7: { strategy: 'inline' },
  load_balancer_l4: { strategy: 'inline' },
  cache: { strategy: 'inline' },

  queue: { strategy: 'branch', from: ['api', 'paas_web', 'serverless_fn'], to: ['worker'] },
  event_bus: { strategy: 'branch', from: ['api', 'paas_web', 'serverless_fn'], to: ['worker', 'serverless_fn'] },
  workflow: { strategy: 'branch', from: ['api', 'paas_web'], to: ['worker'] },
  etl_service: { strategy: 'branch', from: ['sql_db', 'nosql_db', 'data_lake'], to: ['data_warehouse'] },

  data_warehouse: { strategy: 'sink', from: ['etl_service', 'sql_db', 'nosql_db', 'data_lake'] },
  metrics: { strategy: 'sink', from: ['api', 'paas_web', 'container_orchestrator', 'worker'] },
  logging: { strategy: 'sink', from: ['api', 'paas_web', 'container_orchestrator', 'worker'] },
  tracing: { strategy: 'sink', from: ['api', 'paas_web', 'container_orchestrator'] },
  alerting: { strategy: 'sink', from: ['metrics', 'logging', 'api'] },
  incident_response: { strategy: 'sink', from: ['alerting', 'metrics'] },
  secret_manager: { strategy: 'sink', from: ['api', 'paas_web', 'serverless_fn', 'worker'] },
  kms: { strategy: 'sink', from: ['secret_manager', 'sql_db', 'object_storage', 'api'] },
  iam: { strategy: 'sink', from: ['api', 'api_gateway'], standaloneOk: true },
  identity_provider: { strategy: 'sink', from: ['api_gateway', 'load_balancer_l7', 'api'] },
  certificate_manager: { strategy: 'sink', from: ['load_balancer_l7', 'api_gateway', 'cdn'] },
  threat_detection: { strategy: 'sink', from: ['api', 'vpc'], standaloneOk: true },
  security_hub: { strategy: 'sink', from: ['threat_detection', 'api'], standaloneOk: true },
  data_protection: { strategy: 'sink', from: ['sql_db', 'nosql_db', 'object_storage', 'data_warehouse'] },
  vuln_scanner: { strategy: 'sink', from: ['container_registry', 'container_orchestrator'], standaloneOk: true },
  audit_trail: { strategy: 'sink', from: ['api', 'api_gateway', 'iam'], standaloneOk: true },
  cost_management: { strategy: 'sink', from: ['api'], standaloneOk: true },
  backup_service: { strategy: 'sink', from: ['sql_db', 'nosql_db', 'block_storage', 'file_storage', 'object_storage'] },
  container_registry: { strategy: 'sink', from: ['container_orchestrator', 'paas_web'], standaloneOk: true },
  service_mesh: { strategy: 'sink', from: ['api', 'container_orchestrator'] },
  vpc: { strategy: 'sink', from: ['api', 'container_orchestrator'], standaloneOk: true },
  firewall: { strategy: 'sink', from: ['vpc', 'api'], standaloneOk: true },
  iot_device_mgmt: { strategy: 'sink', from: ['iot_core', 'client_iot'] },

  ci_cd: { strategy: 'sink', from: ['source_repo', 'container_orchestrator', 'api'], to: ['container_orchestrator', 'api', 'paas_web'], standaloneOk: true },
  source_repo: { strategy: 'sink', from: [], to: ['ci_cd'], standaloneOk: true },
  iac: { strategy: 'sink', from: [], standaloneOk: true },

  client_web: { strategy: 'entry', to: ['cdn', 'waf', 'api_gateway', 'load_balancer_l7', 'api'] }
};

const ARROW = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#6ee7b7' };
const ARROW_NEW = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#fbbf24' };

export function buildEdge(source, target, { autowired = false, label } = {}) {
  return {
    id: `e_${source}__${target}_${Math.random().toString(36).slice(2, 7)}`,
    source,
    target,
    animated: true,
    label,
    markerEnd: autowired ? ARROW_NEW : ARROW,
    style: autowired
      ? { stroke: '#fbbf24', strokeWidth: 2 }
      : { stroke: '#6ee7b7', strokeWidth: 1.5 },
    className: autowired ? 'autowired' : undefined
  };
}

const rankOf = (type) => (type in TIER_RANK ? TIER_RANK[type] : null);

function firstByPriority(nodes, types) {
  for (const t of types || []) {
    const hit = nodes.find((n) => n.componentType === t);
    if (hit) return hit;
  }
  return null;
}

// Decide how a newly-inserted node connects into the existing graph.
// Returns { position, addEdges, removeEdgeIds }.
export function autoWire(newType, newId, nodes, edges) {
  const cfg = WIRING[newType];
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const fallbackX = nodes.reduce((m, n) => Math.max(m, n.position?.x || 0), 0) + 220;
  const fallback = { position: { x: fallbackX, y: 80 }, addEdges: [], removeEdgeIds: [] };

  if (!cfg) return fallback;

  const near = (node, dx, dy) => ({ x: (node.position?.x || 0) + dx, y: (node.position?.y || 0) + dy });
  const mid = (a, b, dy = -70) => ({
    x: Math.round(((a.position?.x || 0) + (b.position?.x || 0)) / 2),
    y: Math.round(((a.position?.y || 0) + (b.position?.y || 0)) / 2) + dy
  });

  if (cfg.strategy === 'inline') {
    const R = rankOf(newType);
    // 1) Splice into an existing edge whose endpoints straddle this rank.
    for (const e of edges) {
      const ru = rankOf(nodeById[e.source]?.componentType);
      const rv = rankOf(nodeById[e.target]?.componentType);
      if (ru != null && rv != null && ru < R && R < rv) {
        return {
          position: mid(nodeById[e.source], nodeById[e.target]),
          addEdges: [buildEdge(e.source, newId, { autowired: true }), buildEdge(newId, e.target, { autowired: true })],
          removeEdgeIds: [e.id]
        };
      }
    }
    // 2) No edge to splice — connect to nearest ranked neighbours.
    const ranked = nodes
      .map((n) => ({ n, r: rankOf(n.componentType) }))
      .filter((x) => x.r != null);
    const upstream = ranked.filter((x) => x.r < R).sort((a, b) => b.r - a.r)[0]?.n;
    const downstream = ranked.filter((x) => x.r > R).sort((a, b) => a.r - b.r)[0]?.n;
    const addEdges = [];
    if (upstream) addEdges.push(buildEdge(upstream.id, newId, { autowired: true }));
    if (downstream) addEdges.push(buildEdge(newId, downstream.id, { autowired: true }));
    const anchor = upstream || downstream;
    return {
      position: anchor ? near(anchor, upstream ? 200 : -200, 0) : fallback.position,
      addEdges,
      removeEdgeIds: []
    };
  }

  if (cfg.strategy === 'branch') {
    const src = firstByPriority(nodes, cfg.from);
    const dst = firstByPriority(nodes, cfg.to);
    const addEdges = [];
    if (src) addEdges.push(buildEdge(src.id, newId, { autowired: true }));
    if (dst) addEdges.push(buildEdge(newId, dst.id, { autowired: true }));
    const anchor = src || dst;
    return {
      position: anchor ? near(anchor, 200, 140) : fallback.position,
      addEdges,
      removeEdgeIds: []
    };
  }

  if (cfg.strategy === 'entry') {
    const dst = firstByPriority(nodes, cfg.to);
    return {
      position: dst ? near(dst, -220, 0) : fallback.position,
      addEdges: dst ? [buildEdge(newId, dst.id, { autowired: true })] : [],
      removeEdgeIds: []
    };
  }

  // sink
  const src = firstByPriority(nodes, cfg.from);
  const dst = firstByPriority(nodes, cfg.to);
  const addEdges = [];
  if (src) addEdges.push(buildEdge(src.id, newId, { autowired: true }));
  if (dst) addEdges.push(buildEdge(newId, dst.id, { autowired: true }));
  const anchor = src || dst;
  return {
    position: anchor ? near(anchor, 60, 150) : fallback.position,
    addEdges,
    removeEdgeIds: []
  };
}
