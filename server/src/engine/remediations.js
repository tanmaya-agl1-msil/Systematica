// Remediation guidance for every rule id in scoring.js.
// Keys mirror `rule.id`. Fields:
//   how       - ordered bullet steps for a fix
//   suggests  - component TYPES to auto-insert when the user clicks "Apply fix"
//   docs      - optional external reference URL (kept in-tree link where possible)

export const REMEDIATIONS = {
  // ── Traffic path & edge
  'has-entry-point': {
    how: [
      'Drag a Web Client, Mobile Client, IoT Fleet, or Scheduled Source onto the canvas.',
      'Set its RPS to the expected traffic load.',
      'Connect it to your ingress (CDN / API Gateway / Load Balancer).'
    ],
    suggests: ['client_web']
  },
  'connected-graph': {
    how: [
      'Identify orphan components (unconnected).',
      'Either wire them into the flow or delete them if unused.'
    ],
    suggests: []
  },
  'edge-cdn-for-assets': {
    how: [
      'Add a CDN component in front of your Object Storage.',
      'Point the CDN at the Object Storage as its origin.',
      'Set the cache hit ratio realistically (0.7-0.9 for static assets).'
    ],
    suggests: ['cdn']
  },
  'waf-on-public-edge': {
    how: [
      'Add a WAF component between the public internet and your ingress (CDN, API Gateway, or L7 LB).',
      'Enable managed rulesets (OWASP Top 10, bot mitigation).',
      'Tune false-positive rules based on your traffic pattern.'
    ],
    suggests: ['waf']
  },
  'api-gateway-for-external-apis': {
    how: [
      'Add an API Gateway or L7 Load Balancer between your entry and API services.',
      'Move authentication, rate limiting, and request validation to the gateway.',
      'Terminate TLS at the gateway rather than each API.'
    ],
    suggests: ['api_gateway']
  },

  // ── Compute & scaling
  'load-balancer-for-multi-instance-api': {
    how: [
      'Add a Load Balancer (L7 preferred for HTTP) between the entry and your APIs.',
      'Configure health checks so unhealthy instances drop out.',
      'Enable connection draining for graceful deploys.'
    ],
    suggests: ['load_balancer_l7']
  },
  'horizontal-api': {
    how: [
      'Select each API service and set Instances ≥ 2.',
      'Ensure the API is stateless so requests can hit any instance.',
      'Add autoscaling so instance count grows with traffic.'
    ],
    suggests: []
  },
  'stateless-api': {
    how: [
      'Uncheck "Stateful" on the API service.',
      'Move session state to a Cache (Redis) or an Identity Provider token.',
      'Store any in-memory queues in a Message Queue instead.'
    ],
    suggests: ['cache']
  },
  'autoscaling-enabled': {
    how: [
      'Enable "Autoscaling" on your APIs, Workers, and Container Orchestrators.',
      'Set target metrics (CPU / RPS / queue depth).',
      'Configure sensible min / max instance bounds.'
    ],
    suggests: []
  },
  'multi-az-critical-compute': {
    how: [
      'Enable Multi-AZ on APIs, Container Orchestrators, and SQL Databases.',
      'Spread instances across at least 2 availability zones.',
      'Verify your load balancer is also zone-redundant.'
    ],
    suggests: []
  },

  // ── Data
  'read-cache-in-front-of-db': {
    how: [
      'Add a Cache component between your APIs and the Database.',
      'Route reads through the cache first, fall through to DB on miss.',
      'Set hit rate expectations realistically (0.7-0.9 for hot data).'
    ],
    suggests: ['cache']
  },
  'db-replication-or-sharding': {
    how: [
      'Add read replicas (replicas ≥ 1) to spread read load and enable failover.',
      'Enable Multi-AZ for zone-level fault tolerance.',
      'For write-heavy workloads, enable sharding / partitioning.'
    ],
    suggests: []
  },
  'db-backups-enabled': {
    how: [
      'Enable "Automated backups" on every SQL Database.',
      'Set retention to at least 7-30 days.',
      'Periodically test restore procedures — a backup you can\'t restore is worthless.'
    ],
    suggests: ['backup_service']
  },
  'cache-ha': {
    how: [
      'Enable "HA replica" on every Cache component.',
      'For Redis, use cluster mode or a replica group.',
      'Plan for cache warm-up after node failures to avoid a thundering herd.'
    ],
    suggests: []
  },
  'analytics-separate-from-oltp': {
    how: [
      'Add a Data Warehouse for analytical queries.',
      'Use ETL / CDC to stream data from OLTP → Warehouse.',
      'Point BI tools at the Warehouse, not the OLTP DB.'
    ],
    suggests: ['data_warehouse', 'etl_service']
  },

  // ── Async & decoupling
  'workers-behind-queue': {
    how: [
      'Add a Queue, Stream, or Event Bus between the producer and the Worker.',
      'The Worker should pull from the queue at its own pace.',
      'Enable a DLQ so poison messages don\'t block the pipeline.'
    ],
    suggests: ['queue']
  },
  'queue-dlq': {
    how: [
      'Enable "Dead-letter queue" on every Queue.',
      'Set max-receive count to 3-5 before routing to DLQ.',
      'Monitor DLQ depth — it\'s a leading indicator of bugs.'
    ],
    suggests: []
  },
  'event-driven-decoupling': {
    how: [
      'Introduce an Event Bus or Message Queue between services that don\'t need synchronous responses.',
      'Convert fire-and-forget calls (notifications, audits, analytics) to events.',
      'Keep synchronous only where the caller genuinely needs the result.'
    ],
    suggests: ['event_bus']
  },

  // ── Security
  'identity-provider-present': {
    how: [
      'Add an Identity Provider (Cognito / Entra ID / Cloud Identity / Keycloak).',
      'Enable MFA for admin users.',
      'Have your API Gateway validate tokens issued by the IdP.'
    ],
    suggests: ['identity_provider']
  },
  'secret-management': {
    how: [
      'Add a Secret Manager component.',
      'Migrate secrets out of env vars, config files, and Git.',
      'Have services fetch secrets at startup (or use dynamic credentials via KMS).'
    ],
    suggests: ['secret_manager']
  },
  'mtls-mesh': {
    how: [
      'Add a Service Mesh (Istio / Linkerd / App Mesh).',
      'Enable "mTLS enforced" so all service-to-service traffic is encrypted.',
      'Use mesh policies for retries, timeouts, and circuit breaking.'
    ],
    suggests: ['service_mesh']
  },

  // ── Observability
  'metrics-present': {
    how: [
      'Add a Metrics System (Prometheus / CloudWatch / Azure Monitor).',
      'Instrument RED metrics on APIs (Rate, Errors, Duration).',
      'Define SLIs / SLOs based on these metrics.'
    ],
    suggests: ['metrics']
  },
  'logging-present': {
    how: [
      'Add a centralized Log Aggregator.',
      'Emit structured logs (JSON) from every service.',
      'Include a correlation / trace ID on every log line.'
    ],
    suggests: ['logging']
  },
  'tracing-for-microservices': {
    how: [
      'Add a Distributed Tracing component (Jaeger / Tempo / X-Ray).',
      'Instrument services with OpenTelemetry.',
      'Sample at 1-10% for production, 100% in staging.'
    ],
    suggests: ['tracing']
  },
  'alerting-present': {
    how: [
      'Add an Alerting component and connect it to your Metrics System.',
      'Define alerts on SLOs, not on individual metric anomalies.',
      'Route to an on-call rotation (PagerDuty / Opsgenie).'
    ],
    suggests: ['alerting']
  },

  // ── Performance
  'edge-compute-close-to-users': {
    how: [
      'Add a CDN or Edge Function to serve close to end users.',
      'Cache API responses at the edge where safe.',
      'Route dynamic requests to the nearest healthy region.'
    ],
    suggests: ['cdn']
  },

  // ── Cost efficiency
  'no-premium-tier-when-unneeded': {
    how: [
      'Downgrade the Load Balancer tier from "premium" to "standard".',
      'If a premium feature is truly required, document why.',
      'Re-evaluate when the load actually approaches standard-tier limits.'
    ],
    suggests: []
  },
  'no-orphan-gpu': {
    how: [
      'Reduce Model Serving instance count until utilization ≥ 20%.',
      'Consider CPU-backed inference for low-QPS workloads.',
      'Consolidate multiple models onto a single GPU endpoint if compatible.'
    ],
    suggests: []
  },

  // ── Headroom & bottlenecks
  'no-overloaded-components': {
    how: [
      'For each overloaded component, increase its capacity (instances, throughput, shards).',
      'Or absorb upstream load with a Cache or CDN.',
      'Verify the load propagation assumes realistic hit rates and fan-out.'
    ],
    suggests: []
  },
  'components-have-headroom': {
    how: [
      'Reduce steady-state utilization to under 70% by adding capacity.',
      'Enable autoscaling so spikes trigger scale-out automatically.',
      'Add a Cache to reduce downstream pressure.'
    ],
    suggests: []
  },

  // ── Modularity guardrails
  'db-not-shared-across-services': {
    how: [
      'Give each service its own database, or introduce a data-access API.',
      'For read-only access across services, use a replica or an event-sourced projection.',
      'For writes, apply the Saga pattern via a Workflow Orchestrator.'
    ],
    suggests: ['workflow']
  },
  'observability-not-in-critical-path': {
    how: [
      'Remove any outgoing edges from Metrics / Logging / Tracing components.',
      'These should be terminal sinks in your diagram.',
      'If you need alerts back to the app, use the Alerting component instead.'
    ],
    suggests: []
  },

  // ── DevOps hygiene
  'ci-cd-present': {
    how: [
      'Add a CI/CD Pipeline component.',
      'Wire it to your Source Repository → Artifact Registry → deploy target.',
      'Include automated tests, security scans, and canary deploys.'
    ],
    suggests: ['ci_cd', 'source_repo']
  },
  'iac-present': {
    how: [
      'Add an Infrastructure-as-Code component (Terraform / Bicep / CloudFormation / Pulumi).',
      'Move all cloud resource creation into IaC modules.',
      'Enforce PR review on IaC changes and drift detection.'
    ],
    suggests: ['iac']
  },
  'artifact-registry-present': {
    how: [
      'Add a Container Registry or Artifact Repository.',
      'Push all built images / packages there as part of CI.',
      'Deploy only images signed by your registry, not from public sources.'
    ],
    suggests: ['container_registry']
  },
  'vuln-scanning': {
    how: [
      'Add a Vulnerability Scanner component.',
      'Wire it to your Container Registry to scan on push.',
      'Fail the build on critical CVEs; alert on high CVEs.'
    ],
    suggests: ['vuln_scanner']
  },

  // ── Security posture
  'iam-present': {
    how: [
      'Add an IAM / Access Control component to model least-privilege roles.',
      'Grant workloads to roles, not long-lived access keys.',
      'Review role permissions quarterly.'
    ],
    suggests: ['iam']
  },
  'tls-cert-management': {
    how: [
      'Add a Certificate Manager component.',
      'Attach managed certs to your CDN / API Gateway / L7 LB.',
      'Enable auto-renewal so certs never expire in production.'
    ],
    suggests: ['certificate_manager']
  },
  'ddos-protection-for-public': {
    how: [
      'Add a DDoS Protection component (or ensure your CDN provides it).',
      'For high-value public endpoints, upgrade to an advanced tier.',
      'Configure rate-based rules on your WAF as a second layer.'
    ],
    suggests: ['ddos_protection']
  },
  'threat-detection-present': {
    how: [
      'Add a Threat Detection component (GuardDuty / Defender / SCC).',
      'Route findings to your central Security Hub if present.',
      'Establish an incident-response runbook for each finding type.'
    ],
    suggests: ['threat_detection']
  },
  'pii-data-protection': {
    how: [
      'Add a Data Protection / PII component.',
      'Run scheduled discovery scans on your data stores.',
      'Automate quarantine or redaction when PII lands in wrong stores.'
    ],
    suggests: ['data_protection']
  },

  // ── Networking hygiene
  'vpc-wrapping': {
    how: [
      'Add a VPC / Virtual Network component.',
      'Place private compute and data components inside it.',
      'Expose services only through your ingress (CDN / API Gateway / LB).'
    ],
    suggests: ['vpc']
  },
  'firewall-present': {
    how: [
      'Add a Firewall / NSG component to your VPC.',
      'Default-deny inbound, allow only specific ports from specific sources.',
      'Log flow denials to your Log Aggregator.'
    ],
    suggests: ['firewall']
  },

  // ── Governance / compliance / cost
  'audit-trail-present': {
    how: [
      'Add an Audit / Activity Log component.',
      'Set retention to at least 365 days (or as required by compliance).',
      'Stream audit events to your Log Aggregator or SIEM.'
    ],
    suggests: ['audit_trail']
  },
  'cost-monitoring': {
    how: [
      'Add a Cost Management component.',
      'Define per-team budgets and forecast alerts.',
      'Review Well-Architected Advisor recommendations monthly.'
    ],
    suggests: ['cost_management']
  },
  'central-backup-for-many-stateful': {
    how: [
      'Add a Backup Service component.',
      'Register all stateful components (SQL, NoSQL, block storage, file storage).',
      'Test restore quarterly.'
    ],
    suggests: ['backup_service']
  },
  'multi-region-object-storage': {
    how: [
      'Change Object Storage redundancy to "region" or "multi-region".',
      'For truly critical data, use multi-region and version everything.',
      'Note: multi-region has cost and consistency trade-offs.'
    ],
    suggests: []
  },
  'iot-defender-for-fleets': {
    how: [
      'Add an IoT Device Management component.',
      'Enable OTA firmware updates and certificate rotation.',
      'Monitor device posture and quarantine anomalous devices.'
    ],
    suggests: ['iot_device_mgmt']
  }
};

export function remediationFor(ruleId) {
  return REMEDIATIONS[ruleId] || { how: [], suggests: [] };
}
