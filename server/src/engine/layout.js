import { COMPONENT_SPECS } from '../engine/components.js';

// Column index per component, mirroring the traffic-flow tiers used by the
// client's auto-wiring. Imported graphs get laid out left→right by tier.
const TIER = {
  Entry: 0,
  Network: 1,
  Compute: 3,
  Data: 5,
  Storage: 6,
  Async: 4,
  'ML/AI': 4,
  IoT: 1,
  Media: 4,
  Security: 7,
  Observability: 8,
  DevOps: 9,
  Governance: 9,
  'End-User': 0
};

const OVERRIDE = {
  dns: 1,
  cdn: 1,
  ddos_protection: 1,
  waf: 1,
  api_gateway: 2,
  load_balancer_l7: 2,
  load_balancer_l4: 2,
  service_mesh: 2,
  cache: 4,
  worker: 4,
  sql_db: 5,
  nosql_db: 5,
  data_warehouse: 6,
  data_lake: 6
};

const COL_W = 260;
const ROW_H = 120;
const TOP = 40;

export function layoutByTier(nodes, edges = []) {
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  edges.forEach((e) => indeg.set(e.target, (indeg.get(e.target) || 0) + 1));

  const columns = new Map();
  for (const n of nodes) {
    const spec = COMPONENT_SPECS[n.type];
    const col = OVERRIDE[n.type] ?? TIER[spec?.category] ?? 4;
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col).push(n);
  }

  const sortedCols = [...columns.keys()].sort((a, b) => a - b);
  const positioned = [];

  sortedCols.forEach((col, colIdx) => {
    const bucket = columns.get(col);
    // Roots first so entry points sit near the top of their column.
    bucket.sort((a, b) => (indeg.get(a.id) || 0) - (indeg.get(b.id) || 0));
    const offset = -((bucket.length - 1) * ROW_H) / 2;
    bucket.forEach((n, row) => {
      positioned.push({
        ...n,
        position: {
          x: colIdx * COL_W,
          y: Math.round(TOP + 360 + offset + row * ROW_H)
        }
      });
    });
  });

  return positioned;
}
