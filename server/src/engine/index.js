import { analyzeBottlenecks } from './bottlenecks.js';
import { estimateCost } from './cost.js';
import { score, DIMENSIONS } from './scoring.js';
import { specFor } from './components.js';

function normalize(nodes) {
  return (nodes || []).map((n) => {
    const spec = specFor(n.type);
    if (!spec) return n;
    const config = { ...spec.defaultConfig, ...(n.data?.config || {}) };
    return { ...n, data: { ...n.data, config } };
  });
}

export function evaluateDesign({ nodes, edges }) {
  const normNodes = normalize(nodes);
  const normEdges = edges || [];
  const load = analyzeBottlenecks(normNodes, normEdges);
  const cost = estimateCost(normNodes);
  const sc = score({ nodes: normNodes, edges: normEdges, report: load });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      nodes: normNodes.length,
      edges: normEdges.length,
      overall: sc.overall,
      grade: sc.grade,
      monthlyCost: cost.monthly,
      bottleneckCount: load.bottlenecks.length,
      findingCount: sc.findings.length
    },
    dimensions: sc.dimensions,
    dimensionOrder: DIMENSIONS,
    findings: sc.findings,
    bottlenecks: load.bottlenecks,
    load: load.load,
    cost
  };
}
