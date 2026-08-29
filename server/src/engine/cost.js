import { specFor } from './components.js';

export function estimateCost(nodes) {
  const breakdown = [];
  let monthly = 0;
  for (const n of nodes) {
    const spec = specFor(n.type);
    if (!spec) continue;
    const cfg = n.data?.config || spec.defaultConfig;
    const c = Number(spec.monthlyCost(cfg)) || 0;
    monthly += c;
    breakdown.push({
      id: n.id,
      type: n.type,
      label: n.data?.label || spec.label,
      monthly: Number(c.toFixed(2))
    });
  }
  return {
    monthly: Number(monthly.toFixed(2)),
    annual: Number((monthly * 12).toFixed(2)),
    breakdown: breakdown.sort((a, b) => b.monthly - a.monthly)
  };
}
