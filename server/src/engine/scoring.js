import { specFor } from './components.js';
import { remediationFor } from './remediations.js';

// -----------------------------------------------------------------------------
// Multi-dimensional architecture scoring.
//
// Each rule declares a `contributions` map: dimension -> weight. If the rule
// passes, that weight counts toward `earned`. If it fails, it counts only
// toward `total` (i.e. dropping the score) and produces a finding.
//
// Dimensions (0-100 each):
//   scalability     – ability to grow with load
//   faultTolerance  – ability to survive failures
//   availability    – uptime posture (HA, multi-AZ, redundancy)
//   performance     – latency / throughput characteristics
//   security        – auth, secrets, encryption, edge protection
//   costEfficiency  – avoiding waste and premium tiers where unneeded
//   modularity      – decoupling, async boundaries, clear separation
//   observability   – metrics, logs, tracing, alerting
//   maintainability – managed services, autoscaling, backups
// -----------------------------------------------------------------------------

const DIMENSIONS = [
  'scalability',
  'faultTolerance',
  'availability',
  'performance',
  'security',
  'costEfficiency',
  'modularity',
  'observability',
  'maintainability',
  'governance'
];

// Utility helpers used inside rules.
const has = (nodes, type) => nodes.some((n) => n.type === type);
const anyOf = (nodes, types) => nodes.some((n) => types.includes(n.type));
const all = (nodes, pred) => nodes.filter(pred);
const bytrait = (nodes, key) =>
  nodes.filter((n) => {
    const s = specFor(n.type);
    return s?.traits?.[key];
  });
const cfg = (n) => n.data?.config || specFor(n.type)?.defaultConfig || {};

// Downstream helper: given a source node, find directly-connected downstream nodes.
function downstream(nodes, edges, sourceId) {
  const set = new Set();
  edges.forEach((e) => {
    if (e.source === sourceId) set.add(e.target);
  });
  return nodes.filter((n) => set.has(n.id));
}

// Reverse.
function upstream(nodes, edges, targetId) {
  const set = new Set();
  edges.forEach((e) => {
    if (e.target === targetId) set.add(e.source);
  });
  return nodes.filter((n) => set.has(n.id));
}

// -----------------------------------------------------------------------------
// Rule set.  Each rule: { id, contributions:{dim:weight}, check(ctx) }
// check returns { passed, severity?, message? }
// -----------------------------------------------------------------------------
const rules = [
  // ── Traffic path / edge
  {
    id: 'has-entry-point',
    contributions: { modularity: 3, scalability: 2 },
    check: ({ nodes }) => {
      const entries = bytrait(nodes, 'entry');
      return entries.length
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'No client / entry component — add one to model incoming traffic.'
          };
    }
  },
  {
    id: 'connected-graph',
    contributions: { modularity: 5 },
    check: ({ nodes, edges }) => {
      if (nodes.length <= 1) return { passed: true };
      const connected = new Set();
      edges.forEach((e) => {
        connected.add(e.source);
        connected.add(e.target);
      });
      const orphans = nodes.filter((n) => !connected.has(n.id));
      return orphans.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: `${orphans.length} disconnected component(s) — they contribute nothing to the flow.`
          };
    }
  },
  {
    id: 'edge-cdn-for-assets',
    contributions: { performance: 5, costEfficiency: 3, scalability: 2 },
    check: ({ nodes }) => {
      const staticData = has(nodes, 'object_storage');
      const cdn = has(nodes, 'cdn');
      if (staticData && !cdn) {
        return {
          passed: false,
          severity: 'medium',
          message: 'Object Storage without a CDN — static assets are slow and expensive from origin.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'waf-on-public-edge',
    contributions: { security: 6 },
    check: ({ nodes }) => {
      const hasPublicIngress = has(nodes, 'cdn') || has(nodes, 'api_gateway') || anyOf(nodes, ['load_balancer_l7']);
      if (!hasPublicIngress) return { passed: true };
      return has(nodes, 'waf')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'Public ingress without a WAF — OWASP top-10 threats are unmitigated.'
          };
    }
  },
  {
    id: 'api-gateway-for-external-apis',
    contributions: { security: 4, modularity: 3 },
    check: ({ nodes, edges }) => {
      const entries = bytrait(nodes, 'entry');
      if (!entries.length || !has(nodes, 'api')) return { passed: true };
      const goesThroughGateway = has(nodes, 'api_gateway') || has(nodes, 'load_balancer_l7');
      return goesThroughGateway
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'External APIs exposed without an API Gateway or L7 Load Balancer.'
          };
    }
  },

  // ── Compute / scaling
  {
    id: 'load-balancer-for-multi-instance-api',
    contributions: { scalability: 6, availability: 4 },
    check: ({ nodes }) => {
      const apis = nodes.filter((n) => n.type === 'api' && (cfg(n).instances || 1) >= 2);
      if (!apis.length) return { passed: true };
      const lb = anyOf(nodes, ['load_balancer_l7', 'load_balancer_l4', 'api_gateway']);
      return lb
        ? { passed: true }
        : {
            passed: false,
            severity: 'high',
            message: 'Multi-instance API tier has no Load Balancer or API Gateway in front of it.'
          };
    }
  },
  {
    id: 'horizontal-api',
    contributions: { scalability: 8, availability: 4, faultTolerance: 3 },
    check: ({ nodes }) => {
      const apis = nodes.filter((n) => n.type === 'api');
      if (!apis.length) return { passed: true };
      const scaled = apis.every((a) => (cfg(a).instances || 1) >= 2);
      return scaled
        ? { passed: true }
        : {
            passed: false,
            severity: 'high',
            message: 'API tier runs a single instance — no horizontal scaling or failover.'
          };
    }
  },
  {
    id: 'stateless-api',
    contributions: { scalability: 5, modularity: 3 },
    check: ({ nodes }) => {
      const stateful = nodes.find((n) => n.type === 'api' && cfg(n).stateful);
      return stateful
        ? {
            passed: false,
            severity: 'medium',
            message: `API "${stateful.data?.label || stateful.id}" is stateful — sticky sessions hurt scale-out.`
          }
        : { passed: true };
    }
  },
  {
    id: 'autoscaling-enabled',
    contributions: { scalability: 4, costEfficiency: 4 },
    check: ({ nodes }) => {
      const scalables = nodes.filter((n) => ['api', 'worker', 'container_orchestrator'].includes(n.type));
      if (!scalables.length) return { passed: true };
      const missing = scalables.filter((n) => cfg(n).autoscale === false);
      return missing.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: `${missing.length} scalable service(s) lack autoscaling — capacity fixed to peak.`
          };
    }
  },
  {
    id: 'multi-az-critical-compute',
    contributions: { availability: 8, faultTolerance: 6 },
    check: ({ nodes }) => {
      const targets = nodes.filter((n) =>
        ['api', 'container_orchestrator', 'sql_db'].includes(n.type)
      );
      if (!targets.length) return { passed: true };
      const single = targets.filter((n) => cfg(n).multiAZ === false);
      return single.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'high',
            message: `${single.length} critical component(s) not Multi-AZ — one zone failure takes the system down.`
          };
    }
  },

  // ── Data
  {
    id: 'read-cache-in-front-of-db',
    contributions: { performance: 7, scalability: 4, costEfficiency: 3 },
    check: ({ nodes }) => {
      const dbs = nodes.filter((n) => ['sql_db', 'nosql_db', 'graph_db'].includes(n.type));
      if (!dbs.length) return { passed: true };
      return has(nodes, 'cache')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'Databases present but no cache — every read hits durable storage.'
          };
    }
  },
  {
    id: 'db-replication-or-sharding',
    contributions: { availability: 6, faultTolerance: 6, scalability: 4 },
    check: ({ nodes }) => {
      const dbs = nodes.filter((n) => ['sql_db', 'nosql_db', 'graph_db', 'search_engine'].includes(n.type));
      if (!dbs.length) return { passed: true };
      const weak = dbs.filter((d) => {
        const c = cfg(d);
        return !(c.replicas > 0 || c.multiAZ || c.sharded);
      });
      return weak.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'high',
            message: `${weak.length} database(s) have no replicas / sharding / Multi-AZ — single point of failure.`
          };
    }
  },
  {
    id: 'db-backups-enabled',
    contributions: { faultTolerance: 5, maintainability: 3 },
    check: ({ nodes }) => {
      const sqls = nodes.filter((n) => n.type === 'sql_db');
      if (!sqls.length) return { passed: true };
      const missing = sqls.filter((d) => cfg(d).backups === false);
      return missing.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'high',
            message: 'SQL database backups are disabled — data loss on failure.'
          };
    }
  },
  {
    id: 'cache-ha',
    contributions: { availability: 3, performance: 2 },
    check: ({ nodes }) => {
      const caches = nodes.filter((n) => n.type === 'cache');
      if (!caches.length) return { passed: true };
      const noHA = caches.filter((c) => cfg(c).replicated === false);
      return noHA.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'Cache lacks an HA replica — a single node failure loses cache.'
          };
    }
  },
  {
    id: 'analytics-separate-from-oltp',
    contributions: { performance: 4, modularity: 4 },
    check: ({ nodes, edges }) => {
      const warehouse = nodes.filter((n) => n.type === 'data_warehouse');
      const oltpDbs = nodes.filter((n) => ['sql_db', 'nosql_db'].includes(n.type));
      if (!warehouse.length && oltpDbs.length) {
        // Only warn if there's likely an analytics need (search_engine, timeseries or lake).
        const analyticsSignal = anyOf(nodes, ['search_engine', 'timeseries_db', 'data_lake']);
        if (analyticsSignal) {
          return {
            passed: false,
            severity: 'low',
            message: 'Analytical workloads present without a dedicated Warehouse — will contend with OLTP.'
          };
        }
      }
      return { passed: true };
    }
  },

  // ── Async / decoupling
  {
    id: 'workers-behind-queue',
    contributions: { modularity: 5, scalability: 4, faultTolerance: 3 },
    check: ({ nodes, edges }) => {
      const workers = nodes.filter((n) => n.type === 'worker');
      if (!workers.length) return { passed: true };
      const behindQueue = workers.every((w) =>
        upstream(nodes, edges, w.id).some((u) => ['queue', 'stream', 'event_bus'].includes(u.type))
      );
      return behindQueue
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'Workers not consuming from a queue / stream — tight coupling limits throughput.'
          };
    }
  },
  {
    id: 'queue-dlq',
    contributions: { faultTolerance: 4, maintainability: 2 },
    check: ({ nodes }) => {
      const qs = nodes.filter((n) => n.type === 'queue');
      if (!qs.length) return { passed: true };
      const noDlq = qs.filter((q) => cfg(q).dlq === false);
      return noDlq.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: `${noDlq.length} queue(s) missing a dead-letter queue — poison messages will block processing.`
          };
    }
  },
  {
    id: 'event-driven-decoupling',
    contributions: { modularity: 4, scalability: 2 },
    check: ({ nodes }) => {
      if (nodes.filter((n) => n.type === 'api').length < 2) return { passed: true };
      const async = anyOf(nodes, ['queue', 'stream', 'event_bus', 'workflow']);
      return async
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Multiple services communicate only synchronously — consider async decoupling.'
          };
    }
  },

  // ── Security
  {
    id: 'identity-provider-present',
    contributions: { security: 6 },
    check: ({ nodes }) => {
      const auth = has(nodes, 'identity_provider') || nodes.some((n) => n.type === 'api_gateway' && cfg(n).authEnabled);
      const userEntry = anyOf(nodes, ['client_web', 'client_mobile']);
      if (userEntry && !auth) {
        return {
          passed: false,
          severity: 'high',
          message: 'User-facing entry point without an Identity Provider or gateway auth.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'secret-management',
    contributions: { security: 4, maintainability: 2 },
    check: ({ nodes }) => {
      if (nodes.length < 4) return { passed: true };
      return has(nodes, 'secret_manager') || has(nodes, 'kms')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'No Secret Manager / KMS — credentials likely live in env vars or config.'
          };
    }
  },
  {
    id: 'mtls-mesh',
    contributions: { security: 3 },
    check: ({ nodes }) => {
      const services = nodes.filter((n) => n.type === 'api').length;
      if (services < 3) return { passed: true };
      return has(nodes, 'service_mesh')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: '3+ services without a Service Mesh — service-to-service mTLS is not enforced.'
          };
    }
  },

  // ── Observability
  {
    id: 'metrics-present',
    contributions: { observability: 5, maintainability: 2 },
    check: ({ nodes }) => {
      if (nodes.length < 3) return { passed: true };
      return has(nodes, 'metrics')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'No Metrics system — blind to capacity, errors, and SLOs.'
          };
    }
  },
  {
    id: 'logging-present',
    contributions: { observability: 4 },
    check: ({ nodes }) => {
      if (nodes.length < 3) return { passed: true };
      return has(nodes, 'logging')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'No centralized Log Aggregator — incident forensics will be painful.'
          };
    }
  },
  {
    id: 'tracing-for-microservices',
    contributions: { observability: 4, performance: 2 },
    check: ({ nodes }) => {
      const services = nodes.filter((n) => n.type === 'api').length;
      if (services < 3) return { passed: true };
      return has(nodes, 'tracing')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'Multi-service system without Distributed Tracing — root-causing latency is hard.'
          };
    }
  },
  {
    id: 'alerting-present',
    contributions: { observability: 3, availability: 2 },
    check: ({ nodes }) => {
      if (!has(nodes, 'metrics') && !has(nodes, 'logging')) return { passed: true };
      return has(nodes, 'alerting')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Metrics/logs collected but no Alerting system to page on-call.'
          };
    }
  },

  // ── Performance (edge)
  {
    id: 'edge-compute-close-to-users',
    contributions: { performance: 3 },
    check: ({ nodes }) => {
      const globalUsers = has(nodes, 'client_web') || has(nodes, 'client_mobile');
      if (!globalUsers) return { passed: true };
      return has(nodes, 'cdn') || has(nodes, 'edge_function')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Global users without CDN or Edge Function — high latency for far regions.'
          };
    }
  },

  // ── Cost efficiency
  {
    id: 'no-premium-tier-when-unneeded',
    contributions: { costEfficiency: 3 },
    check: ({ nodes, report }) => {
      const lbs = nodes.filter((n) => ['load_balancer_l7', 'load_balancer_l4'].includes(n.type));
      const premium = lbs.filter((lb) => cfg(lb).tier === 'premium');
      if (!premium.length) return { passed: true };
      // If nothing is hot, premium is overkill.
      const anyHot = (report?.load || []).some((r) => r.utilization > 0.6);
      if (!anyHot) {
        return {
          passed: false,
          severity: 'low',
          message: 'Premium-tier Load Balancer selected but no component is hot — likely over-provisioned.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'no-orphan-gpu',
    contributions: { costEfficiency: 4 },
    check: ({ nodes, report }) => {
      const gpuServing = nodes.filter((n) => n.type === 'model_serving' && cfg(n).gpu);
      if (!gpuServing.length) return { passed: true };
      const utilized = (report?.load || []).find((r) => gpuServing.some((g) => g.id === r.id) && r.utilization > 0.2);
      return utilized
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'GPU-backed inference endpoint with <20% utilization — high cost per request.'
          };
    }
  },

  // ── Headroom / bottlenecks (populated from bottleneck report)
  {
    id: 'no-overloaded-components',
    contributions: { scalability: 10, performance: 4, availability: 4 },
    check: ({ report }) => {
      const overloaded = (report?.load || []).filter((r) => r.utilization > 1);
      return overloaded.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'high',
            message: `${overloaded.length} component(s) exceed capacity: ${overloaded.map((r) => r.label).join(', ')}.`
          };
    }
  },
  {
    id: 'components-have-headroom',
    contributions: { scalability: 5, performance: 3 },
    check: ({ report }) => {
      const hot = (report?.load || []).filter((r) => r.utilization > 0.75 && r.utilization <= 1);
      return hot.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: `${hot.length} component(s) running hot (>75% utilization) — traffic spikes will trip them.`
          };
    }
  },

  // ── Modularity guardrails
  {
    id: 'db-not-shared-across-services',
    contributions: { modularity: 5 },
    check: ({ nodes, edges }) => {
      const dbs = nodes.filter((n) => ['sql_db', 'nosql_db'].includes(n.type));
      const shared = dbs.filter((d) => {
        const writers = upstream(nodes, edges, d.id).filter((u) => u.type === 'api');
        return writers.length >= 3;
      });
      return shared.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: `${shared.length} database(s) written to by 3+ services — likely a shared DB anti-pattern.`
          };
    }
  },
  {
    id: 'observability-not-in-critical-path',
    contributions: { modularity: 2, performance: 2 },
    check: ({ nodes, edges }) => {
      const obs = nodes.filter((n) => ['metrics', 'logging', 'tracing'].includes(n.type));
      const inPath = obs.filter((o) => {
        const outs = edges.filter((e) => e.source === o.id).length;
        return outs > 0;
      });
      return inPath.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Observability sinks routing back into the request path — they should be terminal.'
          };
    }
  },

  // ── DevOps hygiene
  {
    id: 'ci-cd-present',
    contributions: { maintainability: 5, modularity: 2 },
    check: ({ nodes }) => {
      if (nodes.length < 4) return { passed: true };
      return has(nodes, 'ci_cd')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'No CI/CD pipeline — releases will be manual, slow, and error-prone.'
          };
    }
  },
  {
    id: 'iac-present',
    contributions: { maintainability: 4, modularity: 2 },
    check: ({ nodes }) => {
      if (nodes.length < 5) return { passed: true };
      return has(nodes, 'iac')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'No Infrastructure-as-Code component — configuration drift is likely.'
          };
    }
  },
  {
    id: 'artifact-registry-present',
    contributions: { maintainability: 3, security: 2 },
    check: ({ nodes }) => {
      const uses = anyOf(nodes, ['container_orchestrator', 'paas_web']);
      if (!uses) return { passed: true };
      return has(nodes, 'container_registry') || has(nodes, 'artifact_repo')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Container workloads present with no artifact / image registry.'
          };
    }
  },
  {
    id: 'vuln-scanning',
    contributions: { security: 3 },
    check: ({ nodes }) => {
      const containers = has(nodes, 'container_orchestrator') || has(nodes, 'container_registry');
      if (!containers) return { passed: true };
      return has(nodes, 'vuln_scanner')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Container workloads without a vulnerability scanner — unpatched CVEs will ship.'
          };
    }
  },

  // ── Security posture
  {
    id: 'iam-present',
    contributions: { security: 4, governance: 2 },
    check: ({ nodes }) => {
      if (nodes.length < 4) return { passed: true };
      return has(nodes, 'iam') || has(nodes, 'identity_provider')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'No IAM / access-control component — least-privilege is not modeled.'
          };
    }
  },
  {
    id: 'tls-cert-management',
    contributions: { security: 3 },
    check: ({ nodes }) => {
      const publicIngress = anyOf(nodes, ['cdn', 'api_gateway', 'load_balancer_l7']);
      if (!publicIngress) return { passed: true };
      return has(nodes, 'certificate_manager')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Public HTTPS ingress without a Certificate Manager — manual TLS rotation risks outages.'
          };
    }
  },
  {
    id: 'ddos-protection-for-public',
    contributions: { security: 3, availability: 2 },
    check: ({ nodes }) => {
      const publicEntry = nodes.some((n) => {
        const spec = specFor(n.type);
        return spec?.traits?.publicFacing;
      });
      const highScale = (nodes.find((n) => n.type === 'client_web')?.data?.config?.rps || 0) > 10000;
      if (!publicEntry || !highScale) return { passed: true };
      return has(nodes, 'ddos_protection') || has(nodes, 'cdn')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'High-traffic public entry without DDoS protection or CDN — volumetric attacks will land on origin.'
          };
    }
  },
  {
    id: 'threat-detection-present',
    contributions: { security: 3, observability: 2 },
    check: ({ nodes }) => {
      if (nodes.length < 6) return { passed: true };
      return has(nodes, 'threat_detection') || has(nodes, 'security_hub')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'No Threat Detection or Security Hub — anomalous activity will go unnoticed.'
          };
    }
  },
  {
    id: 'pii-data-protection',
    contributions: { security: 2, governance: 2 },
    check: ({ nodes }) => {
      const stores = nodes.filter((n) => ['sql_db', 'nosql_db', 'data_warehouse', 'data_lake', 'object_storage'].includes(n.type));
      if (stores.length < 2) return { passed: true };
      return has(nodes, 'data_protection')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Multiple data stores without PII discovery / DLP.'
          };
    }
  },

  // ── Networking hygiene
  {
    id: 'vpc-wrapping',
    contributions: { security: 2, modularity: 2 },
    check: ({ nodes }) => {
      const hasPrivateCompute = anyOf(nodes, ['vm', 'container_orchestrator', 'sql_db', 'nosql_db']);
      if (!hasPrivateCompute) return { passed: true };
      return has(nodes, 'vpc')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'Private compute / data without a VPC / VNet — no clear network isolation boundary.'
          };
    }
  },
  {
    id: 'firewall-present',
    contributions: { security: 2 },
    check: ({ nodes }) => {
      if (!has(nodes, 'vpc')) return { passed: true };
      return has(nodes, 'firewall')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'VPC present but no Firewall / NSG — default rules are permissive.'
          };
    }
  },

  // ── Governance / compliance / cost
  {
    id: 'audit-trail-present',
    contributions: { governance: 4, security: 2, observability: 2 },
    check: ({ nodes }) => {
      if (nodes.length < 5) return { passed: true };
      return has(nodes, 'audit_trail')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: 'No Audit / Activity Log — you can\'t answer "who did what, when".'
          };
    }
  },
  {
    id: 'cost-monitoring',
    contributions: { costEfficiency: 4, governance: 2 },
    check: ({ nodes, report }) => {
      const cost = report?.cost?.monthly || 0;
      if (cost < 500) return { passed: true };
      return has(nodes, 'cost_management')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: `Estimated spend $${Math.round(cost)}/mo without a Cost Management component.`
          };
    }
  },
  {
    id: 'central-backup-for-many-stateful',
    contributions: { faultTolerance: 4, maintainability: 2 },
    check: ({ nodes }) => {
      const stateful = nodes.filter((n) => {
        const spec = specFor(n.type);
        return spec?.traits?.stateful;
      });
      if (stateful.length < 3) return { passed: true };
      return has(nodes, 'backup_service')
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: '3+ stateful components without a central Backup Service.'
          };
    }
  },
  {
    id: 'multi-region-object-storage',
    contributions: { faultTolerance: 3, availability: 3 },
    check: ({ nodes }) => {
      const stores = nodes.filter((n) => n.type === 'object_storage');
      if (!stores.length) return { passed: true };
      const single = stores.filter((s) => ['local', 'zone'].includes(cfg(s).redundancy));
      return single.length === 0
        ? { passed: true }
        : {
            passed: false,
            severity: 'medium',
            message: `${single.length} object store(s) with only local / zone redundancy — regional outage loses data.`
          };
    }
  },
  {
    id: 'iot-defender-for-fleets',
    contributions: { security: 3, faultTolerance: 2 },
    check: ({ nodes }) => {
      const fleet = nodes.some((n) => n.type === 'client_iot' && (cfg(n).rps || 0) > 500);
      if (!fleet) return { passed: true };
      return has(nodes, 'iot_device_mgmt')
        ? { passed: true }
        : {
            passed: false,
            severity: 'low',
            message: 'IoT fleet present without Device Management / Defender — OTA + posture unmanaged.'
          };
    }
  }
];

// -----------------------------------------------------------------------------
// Scorer
// -----------------------------------------------------------------------------
export function score({ nodes, edges, report }) {
  const dimTotals = Object.fromEntries(DIMENSIONS.map((d) => [d, 0]));
  const dimEarned = Object.fromEntries(DIMENSIONS.map((d) => [d, 0]));
  const findings = [];

  for (const r of rules) {
    let outcome;
    try {
      outcome = r.check({ nodes, edges, report }) || { passed: true };
    } catch (e) {
      outcome = { passed: true }; // A broken rule shouldn't kill the report.
    }
    for (const [dim, w] of Object.entries(r.contributions || {})) {
      if (!DIMENSIONS.includes(dim)) continue;
      dimTotals[dim] += w;
      if (outcome.passed) dimEarned[dim] += w;
    }
    if (!outcome.passed) {
      const contribs = r.contributions || {};
      const totalWeight = Object.values(contribs).reduce((s, w) => s + w, 0);
      findings.push({
        rule: r.id,
        severity: outcome.severity || 'medium',
        message: outcome.message,
        dimensions: Object.keys(contribs),
        contributions: contribs,
        weight: totalWeight,
        remediation: remediationFor(r.id)
      });
    }
  }

  const dimensions = {};
  for (const d of DIMENSIONS) {
    dimensions[d] = dimTotals[d] === 0 ? 100 : Math.round((dimEarned[d] / dimTotals[d]) * 100);
  }
  // Empty-graph should read as 0 overall, not 100.
  if (nodes.length === 0) {
    for (const d of DIMENSIONS) dimensions[d] = 0;
  }

  const overall = Math.round(
    DIMENSIONS.reduce((s, d) => s + dimensions[d], 0) / DIMENSIONS.length
  );
  const grade =
    overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 60 ? 'D' : 'F';

  // Sort findings: high > medium > low.
  const sevOrder = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3));

  return { overall, grade, dimensions, findings };
}

export { DIMENSIONS };
