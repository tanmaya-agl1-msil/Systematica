// Comprehensive component catalog mapped to AWS / Azure / GCP / On-Prem.
// Each entry:
//   label, category, tags, description
//   providers: { aws, azure, gcp, onprem }
//   defaultConfig, tunables
//   capacity(cfg)   -> rps/msgs-per-sec absorbed (Infinity = unbounded)
//   monthlyCost(cfg) -> illustrative USD/month
//   traits          -> hints used by the rule engine

const p = (aws, azure, gcp, onprem) => ({ aws, azure, gcp, onprem });

export const COMPONENT_SPECS = {
  /* ═══════════════════════ ENTRY / CLIENT ═══════════════════════ */
  client_web: {
    label: 'Web Client', category: 'Entry',
    tags: ['browser', 'spa', 'frontend', 'user'],
    description: 'Browser-based user traffic source.',
    providers: p('Browser', 'Browser', 'Browser', 'Browser'),
    defaultConfig: { rps: 1000 },
    tunables: [{ key: 'rps', label: 'Incoming RPS', type: 'number', min: 1 }],
    capacity: () => Infinity, monthlyCost: () => 0,
    traits: { entry: true, publicFacing: true }
  },
  client_mobile: {
    label: 'Mobile Client', category: 'Entry',
    tags: ['mobile', 'ios', 'android', 'app'],
    description: 'Native mobile application.',
    providers: p('Amplify Client', 'App Center Client', 'Firebase Client', 'Mobile App'),
    defaultConfig: { rps: 500 },
    tunables: [{ key: 'rps', label: 'Incoming RPS', type: 'number', min: 1 }],
    capacity: () => Infinity, monthlyCost: () => 0,
    traits: { entry: true, publicFacing: true }
  },
  client_iot: {
    label: 'IoT Device Fleet', category: 'Entry',
    tags: ['iot', 'device', 'sensor', 'mqtt'],
    description: 'Fleet of connected devices emitting telemetry.',
    providers: p('IoT Core Devices', 'IoT Hub Devices', 'IoT Core Devices', 'MQTT Fleet'),
    defaultConfig: { rps: 2000 },
    tunables: [{ key: 'rps', label: 'Msgs/s', type: 'number', min: 1 }],
    capacity: () => Infinity, monthlyCost: () => 0,
    traits: { entry: true, iot: true }
  },
  client_batch: {
    label: 'Scheduled Job Source', category: 'Entry',
    tags: ['cron', 'batch', 'scheduled', 'timer'],
    description: 'Periodic job trigger (cron / scheduler).',
    providers: p('EventBridge Schedule', 'Logic Apps Timer', 'Cloud Scheduler', 'Cron'),
    defaultConfig: { rps: 10 },
    tunables: [{ key: 'rps', label: 'Trigger rate/s', type: 'number', min: 0.001, step: 0.1 }],
    capacity: () => Infinity, monthlyCost: () => 5,
    traits: { entry: true }
  },
  client_partner: {
    label: 'Partner / B2B API Caller', category: 'Entry',
    tags: ['partner', 'b2b', 'api', 'external'],
    description: 'External partner systems calling your APIs.',
    providers: p('External Client', 'External Client', 'External Client', 'External Client'),
    defaultConfig: { rps: 200 },
    tunables: [{ key: 'rps', label: 'Incoming RPS', type: 'number', min: 1 }],
    capacity: () => Infinity, monthlyCost: () => 0,
    traits: { entry: true, publicFacing: true }
  },

  /* ═══════════════════════ NETWORK / EDGE ═══════════════════════ */
  dns: {
    label: 'DNS', category: 'Network',
    tags: ['dns', 'route53', 'name resolution'],
    description: 'Authoritative DNS with health-based routing.',
    providers: p('Route 53', 'Azure DNS / Traffic Manager', 'Cloud DNS', 'BIND / PowerDNS'),
    defaultConfig: { latencyRouting: true },
    tunables: [{ key: 'latencyRouting', label: 'Latency-based routing', type: 'boolean' }],
    capacity: () => 1_000_000, monthlyCost: () => 10,
    traits: { edge: true, managed: true }
  },
  cdn: {
    label: 'CDN', category: 'Network',
    tags: ['cdn', 'edge', 'cloudfront', 'front door', 'static'],
    description: 'Global edge cache for static assets and cacheable APIs.',
    providers: p('CloudFront', 'Azure Front Door / CDN', 'Cloud CDN', 'Varnish / Nginx Edge'),
    defaultConfig: { regions: 8, cacheHitRate: 0.85 },
    tunables: [
      { key: 'regions', label: 'Edge regions', type: 'number', min: 1, max: 300 },
      { key: 'cacheHitRate', label: 'Cache hit ratio', type: 'number', min: 0, max: 1, step: 0.05 }
    ],
    capacity: (c) => 200_000 * (c.regions || 8),
    monthlyCost: (c) => 20 + (c.regions || 8) * 6,
    traits: { edge: true, cacheable: true }
  },
  global_accelerator: {
    label: 'Global Accelerator', category: 'Network',
    tags: ['anycast', 'global', 'accelerator', 'traffic manager'],
    description: 'Anycast global network entry with static IPs.',
    providers: p('Global Accelerator', 'Front Door / Traffic Manager', 'Global External LB', 'BGP Anycast'),
    defaultConfig: {}, tunables: [],
    capacity: () => 1_000_000, monthlyCost: () => 40,
    traits: { edge: true, managed: true }
  },
  waf: {
    label: 'WAF', category: 'Network',
    tags: ['waf', 'firewall', 'owasp', 'security'],
    description: 'Web Application Firewall — rate limits, OWASP rules.',
    providers: p('AWS WAF', 'Azure WAF', 'Cloud Armor', 'ModSecurity'),
    defaultConfig: { rulesEnabled: 15 },
    tunables: [{ key: 'rulesEnabled', label: 'Managed rulesets', type: 'number', min: 0, max: 200 }],
    capacity: () => 500_000,
    monthlyCost: (c) => 15 + (c.rulesEnabled || 15) * 1.2,
    traits: { security: true, edge: true }
  },
  ddos_protection: {
    label: 'DDoS Protection', category: 'Network',
    tags: ['ddos', 'shield', 'protection'],
    description: 'Volumetric and L7 DDoS mitigation.',
    providers: p('Shield / Shield Advanced', 'DDoS Protection Std', 'Cloud Armor DDoS', 'Radware / Arbor'),
    defaultConfig: { tier: 'standard' },
    tunables: [{ key: 'tier', label: 'Tier', type: 'select', options: ['standard', 'advanced'] }],
    capacity: () => Infinity,
    monthlyCost: (c) => c.tier === 'advanced' ? 3000 : 0,
    traits: { security: true, edge: true }
  },
  api_gateway: {
    label: 'API Gateway', category: 'Network',
    tags: ['api', 'gateway', 'apigee', 'apim', 'rate limit'],
    description: 'Managed ingress: auth, rate limiting, routing.',
    providers: p('API Gateway', 'API Management', 'API Gateway / Apigee', 'Kong / Traefik'),
    defaultConfig: { rateLimitRps: 20000, authEnabled: true },
    tunables: [
      { key: 'rateLimitRps', label: 'Rate limit RPS', type: 'number', min: 1 },
      { key: 'authEnabled', label: 'Auth enforced', type: 'boolean' }
    ],
    capacity: (c) => c.rateLimitRps || 20000,
    monthlyCost: (c) => 40 + (c.rateLimitRps || 20000) * 0.001,
    traits: { managed: true, security: true }
  },
  load_balancer_l7: {
    label: 'Load Balancer (L7)', category: 'Network',
    tags: ['load balancer', 'alb', 'http', 'l7', 'application gateway'],
    description: 'Application-layer load balancer with TLS termination.',
    providers: p('ALB', 'Application Gateway', 'HTTPS LB', 'HAProxy / Nginx'),
    defaultConfig: { tier: 'standard' },
    tunables: [{ key: 'tier', label: 'Tier', type: 'select', options: ['basic', 'standard', 'premium'] }],
    capacity: (c) => ({ basic: 20_000, standard: 100_000, premium: 500_000 }[c.tier] || 100_000),
    monthlyCost: (c) => ({ basic: 20, standard: 55, premium: 220 }[c.tier] || 55),
    traits: { fanOut: true, managed: true }
  },
  load_balancer_l4: {
    label: 'Load Balancer (L4)', category: 'Network',
    tags: ['load balancer', 'nlb', 'tcp', 'l4'],
    description: 'Network-layer load balancer for TCP/UDP.',
    providers: p('NLB', 'Load Balancer', 'Network LB', 'IPVS / LVS'),
    defaultConfig: { tier: 'standard' },
    tunables: [{ key: 'tier', label: 'Tier', type: 'select', options: ['basic', 'standard', 'premium'] }],
    capacity: (c) => ({ basic: 50_000, standard: 300_000, premium: 1_000_000 }[c.tier] || 300_000),
    monthlyCost: (c) => ({ basic: 18, standard: 50, premium: 200 }[c.tier] || 50),
    traits: { fanOut: true, managed: true }
  },
  vpc: {
    label: 'VPC / Virtual Network', category: 'Network',
    tags: ['vpc', 'vnet', 'network', 'subnet'],
    description: 'Isolated virtual network with subnets and routing.',
    providers: p('VPC', 'Virtual Network (VNet)', 'VPC', 'Physical LAN / SDN'),
    defaultConfig: { subnets: 6, cidr: '10.0.0.0/16' },
    tunables: [
      { key: 'subnets', label: 'Subnets', type: 'number', min: 1, max: 200 },
      { key: 'cidr', label: 'CIDR', type: 'select', options: ['10.0.0.0/16', '172.16.0.0/16', '192.168.0.0/16'] }
    ],
    capacity: () => Infinity, monthlyCost: () => 0,
    traits: { network: true, security: true }
  },
  firewall: {
    label: 'Firewall / NSG', category: 'Network',
    tags: ['firewall', 'nsg', 'security group', 'network security'],
    description: 'Stateful network filtering — security groups / NSGs / firewall rules.',
    providers: p('Security Groups / Network Firewall', 'NSG / Azure Firewall', 'Firewall Rules / Cloud Firewall', 'iptables / Palo Alto'),
    defaultConfig: { rules: 30 },
    tunables: [{ key: 'rules', label: 'Rules', type: 'number', min: 1, max: 1000 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 20 + (c.rules || 30) * 0.5,
    traits: { security: true, network: true }
  },
  nat_gateway: {
    label: 'NAT Gateway', category: 'Network',
    tags: ['nat', 'egress', 'outbound'],
    description: 'Managed outbound NAT for private subnets.',
    providers: p('NAT Gateway', 'NAT Gateway', 'Cloud NAT', 'iptables MASQUERADE'),
    defaultConfig: {}, tunables: [],
    capacity: () => 100_000, monthlyCost: () => 45,
    traits: { network: true, managed: true }
  },
  vpn: {
    label: 'VPN / Private Link', category: 'Network',
    tags: ['vpn', 'private', 'ipsec', 'privatelink'],
    description: 'Site-to-site or client VPN / private endpoints.',
    providers: p('VPN Gateway / PrivateLink', 'VPN Gateway / Private Link', 'Cloud VPN / Private Service Connect', 'OpenVPN / IPsec'),
    defaultConfig: {}, tunables: [],
    capacity: () => 10_000, monthlyCost: () => 40,
    traits: { security: true, network: true }
  },
  dedicated_interconnect: {
    label: 'Dedicated Interconnect', category: 'Network',
    tags: ['direct connect', 'expressroute', 'interconnect', 'hybrid'],
    description: 'Private dedicated line to a cloud region.',
    providers: p('Direct Connect', 'ExpressRoute', 'Interconnect', 'MPLS / Leased Line'),
    defaultConfig: { bandwidthGbps: 1 },
    tunables: [{ key: 'bandwidthGbps', label: 'Bandwidth (Gbps)', type: 'number', min: 0.05, max: 100 }],
    capacity: (c) => (c.bandwidthGbps || 1) * 100_000,
    monthlyCost: (c) => 300 + (c.bandwidthGbps || 1) * 250,
    traits: { network: true, hybrid: true }
  },
  service_mesh: {
    label: 'Service Mesh', category: 'Network',
    tags: ['mesh', 'istio', 'linkerd', 'mtls', 'sidecar'],
    description: 'Service-to-service mTLS, retries, observability.',
    providers: p('App Mesh', 'Service Fabric Mesh', 'Anthos Service Mesh / Traffic Director', 'Istio / Linkerd'),
    defaultConfig: { mtls: true },
    tunables: [{ key: 'mtls', label: 'mTLS enforced', type: 'boolean' }],
    capacity: () => 1_000_000, monthlyCost: () => 80,
    traits: { security: true, observability: true }
  },
  service_discovery: {
    label: 'Service Discovery', category: 'Network',
    tags: ['discovery', 'consul', 'cloud map'],
    description: 'Dynamic service registry and discovery.',
    providers: p('Cloud Map', 'Service Fabric / Azure DNS Private', 'Service Directory', 'Consul / etcd'),
    defaultConfig: { services: 20 },
    tunables: [{ key: 'services', label: 'Registered services', type: 'number', min: 1, max: 5000 }],
    capacity: () => 100_000, monthlyCost: () => 15,
    traits: { managed: true, network: true }
  },

  /* ═══════════════════════ COMPUTE ═══════════════════════ */
  api: {
    label: 'API Service', category: 'Compute',
    tags: ['api', 'service', 'http', 'rest', 'microservice'],
    description: 'Stateless HTTP service handling business logic.',
    providers: p('ECS / EKS Service', 'App Service / AKS', 'Cloud Run / GKE', 'Docker / K8s'),
    defaultConfig: { instances: 2, rpsPerInstance: 500, stateful: false, autoscale: true, multiAZ: true },
    tunables: [
      { key: 'instances', label: 'Instances', type: 'number', min: 1, max: 1000 },
      { key: 'rpsPerInstance', label: 'RPS / instance', type: 'number', min: 1 },
      { key: 'stateful', label: 'Stateful?', type: 'boolean' },
      { key: 'autoscale', label: 'Autoscaling', type: 'boolean' },
      { key: 'multiAZ', label: 'Multi-AZ', type: 'boolean' }
    ],
    capacity: (c) => (c.instances || 1) * (c.rpsPerInstance || 500),
    monthlyCost: (c) => (c.instances || 1) * 45,
    traits: { compute: true }
  },
  serverless_fn: {
    label: 'Serverless Function', category: 'Compute',
    tags: ['serverless', 'faas', 'lambda', 'function'],
    description: 'On-demand, auto-scaling function.',
    providers: p('Lambda', 'Azure Functions', 'Cloud Functions', 'OpenFaaS / Knative'),
    defaultConfig: { concurrency: 1000, memoryMB: 512 },
    tunables: [
      { key: 'concurrency', label: 'Max concurrency', type: 'number', min: 1 },
      { key: 'memoryMB', label: 'Memory (MB)', type: 'number', min: 128, max: 10240 }
    ],
    capacity: (c) => (c.concurrency || 1000) * 5,
    monthlyCost: (c) => 5 + (c.concurrency || 1000) * (c.memoryMB || 512) * 0.00002,
    traits: { compute: true, elastic: true, managed: true }
  },
  paas_web: {
    label: 'PaaS Web App', category: 'Compute',
    tags: ['paas', 'app service', 'beanstalk', 'app engine'],
    description: 'Platform-managed web app hosting.',
    providers: p('Elastic Beanstalk / App Runner', 'App Service', 'App Engine', 'Cloud Foundry / Heroku'),
    defaultConfig: { instances: 2, tier: 'standard' },
    tunables: [
      { key: 'instances', label: 'Instances', type: 'number', min: 1, max: 200 },
      { key: 'tier', label: 'Tier', type: 'select', options: ['basic', 'standard', 'premium'] }
    ],
    capacity: (c) => (c.instances || 1) * ({ basic: 200, standard: 600, premium: 1800 }[c.tier] || 600),
    monthlyCost: (c) => (c.instances || 1) * ({ basic: 30, standard: 80, premium: 220 }[c.tier] || 80),
    traits: { compute: true, managed: true }
  },
  container_orchestrator: {
    label: 'Container Orchestrator', category: 'Compute',
    tags: ['kubernetes', 'k8s', 'eks', 'aks', 'gke'],
    description: 'Managed container orchestration cluster.',
    providers: p('EKS', 'AKS', 'GKE', 'Kubernetes'),
    defaultConfig: { nodes: 3, cpuPerNode: 4, multiAZ: true },
    tunables: [
      { key: 'nodes', label: 'Worker nodes', type: 'number', min: 1, max: 500 },
      { key: 'cpuPerNode', label: 'vCPUs / node', type: 'number', min: 1, max: 96 },
      { key: 'multiAZ', label: 'Multi-AZ', type: 'boolean' }
    ],
    capacity: (c) => (c.nodes || 3) * (c.cpuPerNode || 4) * 300,
    monthlyCost: (c) => 75 + (c.nodes || 3) * 80,
    traits: { compute: true, elastic: true }
  },
  container_registry: {
    label: 'Container Registry', category: 'Compute',
    tags: ['ecr', 'acr', 'artifact', 'container', 'image'],
    description: 'Private container image registry.',
    providers: p('ECR', 'Azure Container Registry', 'Artifact Registry', 'Harbor / Nexus'),
    defaultConfig: { storageGB: 100 },
    tunables: [{ key: 'storageGB', label: 'Storage (GB)', type: 'number', min: 1 }],
    capacity: () => 100_000,
    monthlyCost: (c) => 5 + (c.storageGB || 100) * 0.1,
    traits: { managed: true, devops: true }
  },
  vm: {
    label: 'Virtual Machine', category: 'Compute',
    tags: ['vm', 'ec2', 'compute engine', 'virtual machine'],
    description: 'Long-lived VM instance.',
    providers: p('EC2', 'VM', 'Compute Engine', 'KVM / VMware'),
    defaultConfig: { instances: 1, size: 'medium' },
    tunables: [
      { key: 'instances', label: 'Instances', type: 'number', min: 1, max: 1000 },
      { key: 'size', label: 'Size', type: 'select', options: ['small', 'medium', 'large', 'xlarge'] }
    ],
    capacity: (c) => (c.instances || 1) * ({ small: 200, medium: 600, large: 1500, xlarge: 4000 }[c.size] || 600),
    monthlyCost: (c) => (c.instances || 1) * ({ small: 20, medium: 60, large: 160, xlarge: 380 }[c.size] || 60),
    traits: { compute: true }
  },
  lightweight_vm: {
    label: 'Lightweight VM / VPS', category: 'Compute',
    tags: ['lightsail', 'small vm', 'vps'],
    description: 'Bundled compute + storage + bandwidth for small workloads.',
    providers: p('Lightsail', 'B-Series VM', 'e2-micro VM', 'DigitalOcean droplet'),
    defaultConfig: { instances: 1 },
    tunables: [{ key: 'instances', label: 'Instances', type: 'number', min: 1, max: 100 }],
    capacity: (c) => (c.instances || 1) * 150,
    monthlyCost: (c) => (c.instances || 1) * 12,
    traits: { compute: true, managed: true }
  },
  bare_metal: {
    label: 'Bare Metal', category: 'Compute',
    tags: ['bare metal', 'outposts', 'dedicated host'],
    description: 'Dedicated single-tenant physical servers.',
    providers: p('EC2 Bare Metal / Outposts', 'Dedicated Host / Azure Stack', 'Bare Metal Solution', 'Data Center Rack'),
    defaultConfig: { servers: 2 },
    tunables: [{ key: 'servers', label: 'Servers', type: 'number', min: 1, max: 200 }],
    capacity: (c) => (c.servers || 2) * 5000,
    monthlyCost: (c) => (c.servers || 2) * 2200,
    traits: { compute: true, dedicated: true }
  },
  batch_compute: {
    label: 'Batch / HPC', category: 'Compute',
    tags: ['batch', 'hpc', 'jobs', 'array jobs'],
    description: 'Batch job scheduler for large parallel workloads.',
    providers: p('AWS Batch', 'Azure Batch', 'GCP Batch / Dataproc', 'Slurm / PBS'),
    defaultConfig: { concurrentJobs: 500 },
    tunables: [{ key: 'concurrentJobs', label: 'Concurrent jobs', type: 'number', min: 1, max: 100000 }],
    capacity: (c) => (c.concurrentJobs || 500) * 10,
    monthlyCost: (c) => 60 + (c.concurrentJobs || 500) * 0.2,
    traits: { compute: true, async: true, elastic: true }
  },
  worker: {
    label: 'Async Worker', category: 'Compute',
    tags: ['worker', 'consumer', 'background', 'processor'],
    description: 'Background job processor consuming from a queue.',
    providers: p('ECS Task / Lambda', 'Container Apps / Functions', 'Cloud Run Jobs', 'Celery / Sidekiq'),
    defaultConfig: { instances: 2, jobsPerSec: 200 },
    tunables: [
      { key: 'instances', label: 'Instances', type: 'number', min: 1, max: 1000 },
      { key: 'jobsPerSec', label: 'Jobs/s per instance', type: 'number', min: 1 }
    ],
    capacity: (c) => (c.instances || 1) * (c.jobsPerSec || 200),
    monthlyCost: (c) => (c.instances || 1) * 35,
    traits: { compute: true, async: true }
  },
  edge_function: {
    label: 'Edge Function', category: 'Compute',
    tags: ['edge', 'lambda@edge', 'workers', 'cloudflare'],
    description: 'Compute executed at the CDN edge.',
    providers: p('Lambda@Edge / CloudFront Functions', 'Front Door Rules', 'Cloud Run at Edge', 'Cloudflare / Fastly Workers'),
    defaultConfig: { regions: 20 },
    tunables: [{ key: 'regions', label: 'Edge regions', type: 'number', min: 1, max: 300 }],
    capacity: (c) => 100_000 * (c.regions || 20),
    monthlyCost: (c) => 25 + (c.regions || 20) * 3,
    traits: { edge: true, compute: true, elastic: true }
  },

  /* ═══════════════════════ DATA ═══════════════════════ */
  cache: {
    label: 'Cache', category: 'Data',
    tags: ['cache', 'redis', 'memcached', 'elasticache', 'memorystore'],
    description: 'In-memory KV cache in front of durable storage.',
    providers: p('ElastiCache', 'Azure Cache for Redis', 'Memorystore', 'Redis / Memcached'),
    defaultConfig: { sizeGB: 8, hitRate: 0.85, replicated: true },
    tunables: [
      { key: 'sizeGB', label: 'Size (GB)', type: 'number', min: 1, max: 4096 },
      { key: 'hitRate', label: 'Hit rate', type: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'replicated', label: 'HA replica', type: 'boolean' }
    ],
    capacity: (c) => 50_000 + (c.sizeGB || 8) * 3000,
    monthlyCost: (c) => 25 + (c.sizeGB || 8) * 6 + (c.replicated ? 30 : 0),
    traits: { cacheable: true, stateful: true }
  },
  sql_db: {
    label: 'Relational Database', category: 'Data',
    tags: ['sql', 'rds', 'postgres', 'mysql', 'sql database', 'cloud sql'],
    description: 'Managed relational database with ACID guarantees.',
    providers: p('RDS / Aurora', 'Azure SQL / SQL MI / PostgreSQL / MySQL', 'Cloud SQL', 'Postgres / MySQL / SQL Server'),
    defaultConfig: { engine: 'postgres', replicas: 1, multiAZ: true, writesPerSec: 1000, readsPerSec: 5000, backups: true },
    tunables: [
      { key: 'engine', label: 'Engine', type: 'select', options: ['postgres', 'mysql', 'sqlserver', 'aurora'] },
      { key: 'replicas', label: 'Read replicas', type: 'number', min: 0, max: 30 },
      { key: 'multiAZ', label: 'Multi-AZ', type: 'boolean' },
      { key: 'writesPerSec', label: 'Write cap /s', type: 'number', min: 10 },
      { key: 'readsPerSec', label: 'Read cap /s', type: 'number', min: 10 },
      { key: 'backups', label: 'Automated backups', type: 'boolean' }
    ],
    capacity: (c) => (c.writesPerSec || 1000) + (c.readsPerSec || 5000) * (1 + (c.replicas || 0)),
    monthlyCost: (c) => {
      const base = { postgres: 180, mysql: 160, sqlserver: 400, aurora: 260 }[c.engine] || 180;
      return base + (c.replicas || 0) * 90 + (c.multiAZ ? 120 : 0);
    },
    traits: { stateful: true, durable: true }
  },
  distributed_sql: {
    label: 'Distributed SQL', category: 'Data',
    tags: ['spanner', 'alloydb', 'cosmos sql', 'cockroach', 'newsql'],
    description: 'Horizontally scalable strongly-consistent SQL.',
    providers: p('Aurora Global', 'Cosmos DB SQL API', 'Spanner / AlloyDB', 'CockroachDB / YugabyteDB'),
    defaultConfig: { nodes: 3, writesPerSec: 5000, readsPerSec: 25000 },
    tunables: [
      { key: 'nodes', label: 'Nodes', type: 'number', min: 3, max: 200 },
      { key: 'writesPerSec', label: 'Write cap /s', type: 'number', min: 100 },
      { key: 'readsPerSec', label: 'Read cap /s', type: 'number', min: 100 }
    ],
    capacity: (c) => (c.writesPerSec || 5000) + (c.readsPerSec || 25000),
    monthlyCost: (c) => 600 + (c.nodes || 3) * 250,
    traits: { stateful: true, durable: true, sharded: true }
  },
  nosql_db: {
    label: 'NoSQL Document DB', category: 'Data',
    tags: ['nosql', 'dynamodb', 'mongodb', 'documentdb', 'firestore', 'cosmos'],
    description: 'Horizontally scalable document / key-value store.',
    providers: p('DynamoDB / DocumentDB', 'Cosmos DB (Mongo/SQL)', 'Firestore', 'MongoDB / Couchbase'),
    defaultConfig: { engine: 'dynamodb', sharded: true, replicas: 2, rcu: 5000, wcu: 2000 },
    tunables: [
      { key: 'engine', label: 'Engine', type: 'select', options: ['dynamodb', 'mongodb', 'cosmos', 'firestore', 'documentdb'] },
      { key: 'sharded', label: 'Sharded / partitioned', type: 'boolean' },
      { key: 'replicas', label: 'Replicas', type: 'number', min: 0, max: 30 },
      { key: 'rcu', label: 'Read cap /s', type: 'number', min: 10 },
      { key: 'wcu', label: 'Write cap /s', type: 'number', min: 10 }
    ],
    capacity: (c) => ((c.rcu || 5000) + (c.wcu || 2000)) * (c.sharded ? 3 : 1),
    monthlyCost: (c) => 200 + (c.rcu || 5000) * 0.02 + (c.wcu || 2000) * 0.1 + (c.replicas || 0) * 60,
    traits: { stateful: true, durable: true }
  },
  wide_column_db: {
    label: 'Wide-column DB', category: 'Data',
    tags: ['cassandra', 'bigtable', 'keyspaces', 'wide column'],
    description: 'Wide-column store for massive-scale writes.',
    providers: p('Keyspaces (Cassandra)', 'Cosmos DB Cassandra', 'Bigtable', 'Cassandra / ScyllaDB / HBase'),
    defaultConfig: { nodes: 6, writesPerSec: 20000 },
    tunables: [
      { key: 'nodes', label: 'Nodes', type: 'number', min: 3, max: 500 },
      { key: 'writesPerSec', label: 'Write cap /s', type: 'number', min: 100 }
    ],
    capacity: (c) => (c.writesPerSec || 20000) * 3,
    monthlyCost: (c) => 400 + (c.nodes || 6) * 150,
    traits: { stateful: true, durable: true, sharded: true }
  },
  ledger_db: {
    label: 'Ledger Database', category: 'Data',
    tags: ['ledger', 'qldb', 'immutable', 'audit'],
    description: 'Immutable cryptographically-verifiable ledger.',
    providers: p('QLDB', 'Confidential Ledger', 'Cloud Spanner + audit', 'Hyperledger Fabric'),
    defaultConfig: { writesPerSec: 500 },
    tunables: [{ key: 'writesPerSec', label: 'Writes /s', type: 'number', min: 10 }],
    capacity: (c) => c.writesPerSec || 500,
    monthlyCost: () => 250,
    traits: { stateful: true, durable: true, audit: true }
  },
  timeseries_db: {
    label: 'Time-series DB', category: 'Data',
    tags: ['timeseries', 'timestream', 'influx', 'prometheus tsdb'],
    description: 'Store optimized for high-volume time-stamped data.',
    providers: p('Timestream', 'Data Explorer (Kusto)', 'Bigtable / Monarch', 'InfluxDB / TimescaleDB'),
    defaultConfig: { ingestPerSec: 50000, retentionDays: 30 },
    tunables: [
      { key: 'ingestPerSec', label: 'Ingest /s', type: 'number', min: 100 },
      { key: 'retentionDays', label: 'Retention (days)', type: 'number', min: 1, max: 3650 }
    ],
    capacity: (c) => c.ingestPerSec || 50000,
    monthlyCost: (c) => 90 + (c.ingestPerSec || 50000) * 0.001 + (c.retentionDays || 30) * 2,
    traits: { stateful: true, durable: true }
  },
  graph_db: {
    label: 'Graph Database', category: 'Data',
    tags: ['graph', 'neptune', 'neo4j', 'gremlin'],
    description: 'Graph store for relationship-heavy workloads.',
    providers: p('Neptune', 'Cosmos DB Gremlin', 'Spanner Graph', 'Neo4j / JanusGraph'),
    defaultConfig: { instances: 1, queriesPerSec: 500 },
    tunables: [
      { key: 'instances', label: 'Instances', type: 'number', min: 1, max: 50 },
      { key: 'queriesPerSec', label: 'Queries /s per instance', type: 'number', min: 10 }
    ],
    capacity: (c) => (c.instances || 1) * (c.queriesPerSec || 500),
    monthlyCost: (c) => 300 + (c.instances || 1) * 120,
    traits: { stateful: true, durable: true }
  },
  search_engine: {
    label: 'Search Engine', category: 'Data',
    tags: ['search', 'elasticsearch', 'opensearch', 'cognitive search', 'lucene'],
    description: 'Full-text search / analytics engine.',
    providers: p('OpenSearch / CloudSearch', 'Azure Cognitive Search', 'Elastic on GCP', 'Elasticsearch / Solr'),
    defaultConfig: { shards: 3, replicas: 1, queriesPerSec: 2000 },
    tunables: [
      { key: 'shards', label: 'Shards', type: 'number', min: 1, max: 200 },
      { key: 'replicas', label: 'Replicas', type: 'number', min: 0, max: 10 },
      { key: 'queriesPerSec', label: 'Queries /s', type: 'number', min: 10 }
    ],
    capacity: (c) => (c.queriesPerSec || 2000) * (1 + (c.replicas || 0)),
    monthlyCost: (c) => 150 + (c.shards || 3) * 40 + (c.replicas || 0) * 40,
    traits: { stateful: true, durable: true }
  },
  vector_db: {
    label: 'Vector Database', category: 'Data',
    tags: ['vector', 'embedding', 'rag', 'pinecone', 'ai'],
    description: 'Vector similarity search for embeddings / RAG.',
    providers: p('OpenSearch KNN / Kendra', 'Cognitive Search Vectors', 'Vertex Matching Engine', 'Pinecone / Milvus / Weaviate'),
    defaultConfig: { vectors: 1_000_000, queriesPerSec: 500 },
    tunables: [
      { key: 'vectors', label: 'Vector count', type: 'number', min: 1000 },
      { key: 'queriesPerSec', label: 'Queries /s', type: 'number', min: 1 }
    ],
    capacity: (c) => c.queriesPerSec || 500,
    monthlyCost: (c) => 100 + (c.vectors || 1_000_000) / 100_000 * 15,
    traits: { stateful: true, durable: true, ml: true }
  },
  data_warehouse: {
    label: 'Data Warehouse', category: 'Data',
    tags: ['warehouse', 'olap', 'redshift', 'synapse', 'bigquery', 'snowflake'],
    description: 'Columnar analytics warehouse.',
    providers: p('Redshift', 'Synapse Analytics', 'BigQuery', 'ClickHouse / Greenplum'),
    defaultConfig: { compute: 'medium', storageTB: 5 },
    tunables: [
      { key: 'compute', label: 'Compute tier', type: 'select', options: ['small', 'medium', 'large', 'xlarge'] },
      { key: 'storageTB', label: 'Storage (TB)', type: 'number', min: 1, max: 10000 }
    ],
    capacity: () => 1000,
    monthlyCost: (c) => ({ small: 200, medium: 600, large: 1600, xlarge: 4000 }[c.compute] || 600) + (c.storageTB || 5) * 25,
    traits: { stateful: true, durable: true, analytical: true }
  },
  data_lake: {
    label: 'Data Lake', category: 'Data',
    tags: ['lake', 'parquet', 'delta', 'iceberg', 'lakehouse'],
    description: 'Raw / curated file store for analytics.',
    providers: p('S3 + Lake Formation / Glue', 'ADLS Gen2 / Databricks', 'Cloud Storage + BigLake / Dataplex', 'HDFS / MinIO + Iceberg'),
    defaultConfig: { storageTB: 20 },
    tunables: [{ key: 'storageTB', label: 'Storage (TB)', type: 'number', min: 1, max: 100000 }],
    capacity: () => 20000,
    monthlyCost: (c) => (c.storageTB || 20) * 23,
    traits: { stateful: true, durable: true, analytical: true }
  },
  data_catalog: {
    label: 'Data Catalog / Governance', category: 'Data',
    tags: ['catalog', 'glue', 'purview', 'dataplex', 'metadata'],
    description: 'Unified metadata + lineage + governance.',
    providers: p('Glue Data Catalog / Lake Formation', 'Purview', 'Dataplex / Data Catalog', 'Apache Atlas / DataHub'),
    defaultConfig: { assets: 5000 },
    tunables: [{ key: 'assets', label: 'Assets tracked', type: 'number', min: 10 }],
    capacity: () => 100000,
    monthlyCost: (c) => 80 + (c.assets || 5000) * 0.01,
    traits: { governance: true, managed: true }
  },
  etl_service: {
    label: 'ETL / Data Pipeline', category: 'Data',
    tags: ['etl', 'glue', 'dataflow', 'data factory', 'dataproc'],
    description: 'Managed ETL / stream transformation.',
    providers: p('Glue / EMR', 'Data Factory / Synapse Pipelines', 'Dataflow / Dataproc', 'Airflow / Spark'),
    defaultConfig: { dpu: 10, jobsPerHour: 20 },
    tunables: [
      { key: 'dpu', label: 'DPUs', type: 'number', min: 1, max: 500 },
      { key: 'jobsPerHour', label: 'Jobs / hour', type: 'number', min: 1 }
    ],
    capacity: (c) => (c.dpu || 10) * 100,
    monthlyCost: (c) => 100 + (c.dpu || 10) * 40,
    traits: { async: true, analytical: true }
  },

  /* ═══════════════════════ STORAGE ═══════════════════════ */
  object_storage: {
    label: 'Object Storage', category: 'Storage',
    tags: ['object', 's3', 'blob', 'cloud storage'],
    description: 'Durable blob storage for static assets and data.',
    providers: p('S3', 'Blob Storage', 'Cloud Storage', 'MinIO / Ceph'),
    defaultConfig: { sizeGB: 500, versioning: true, redundancy: 'multi-region' },
    tunables: [
      { key: 'sizeGB', label: 'Size (GB)', type: 'number', min: 1 },
      { key: 'versioning', label: 'Versioning', type: 'boolean' },
      { key: 'redundancy', label: 'Redundancy', type: 'select', options: ['local', 'zone', 'region', 'multi-region'] }
    ],
    capacity: () => 100_000,
    monthlyCost: (c) => (c.sizeGB || 500) * 0.023 *
      ({ 'local': 1, 'zone': 1.2, 'region': 1.5, 'multi-region': 2 }[c.redundancy] || 1.5) *
      (c.versioning ? 1.3 : 1),
    traits: { stateful: true, durable: true, cacheable: true }
  },
  block_storage: {
    label: 'Block Storage', category: 'Storage',
    tags: ['block', 'ebs', 'managed disk', 'persistent disk', 'san'],
    description: 'Attached block volumes for VMs / DBs.',
    providers: p('EBS', 'Managed Disks', 'Persistent Disk', 'iSCSI / SAN'),
    defaultConfig: { sizeGB: 500, iops: 3000 },
    tunables: [
      { key: 'sizeGB', label: 'Size (GB)', type: 'number', min: 1 },
      { key: 'iops', label: 'Provisioned IOPS', type: 'number', min: 100 }
    ],
    capacity: (c) => c.iops || 3000,
    monthlyCost: (c) => (c.sizeGB || 500) * 0.1 + (c.iops || 3000) * 0.05,
    traits: { stateful: true, durable: true }
  },
  file_storage: {
    label: 'File Storage', category: 'Storage',
    tags: ['file', 'efs', 'azure files', 'filestore', 'nfs'],
    description: 'Shared file system (NFS / SMB).',
    providers: p('EFS / FSx', 'Azure Files', 'Filestore', 'NFS / GlusterFS'),
    defaultConfig: { sizeGB: 200 },
    tunables: [{ key: 'sizeGB', label: 'Size (GB)', type: 'number', min: 1 }],
    capacity: () => 20000,
    monthlyCost: (c) => (c.sizeGB || 200) * 0.3,
    traits: { stateful: true, durable: true }
  },
  archive_storage: {
    label: 'Archive Storage', category: 'Storage',
    tags: ['glacier', 'archive', 'coldline', 'cold'],
    description: 'Long-term, low-cost archival storage.',
    providers: p('S3 Glacier / Glacier Deep', 'Blob Archive Tier', 'Cloud Storage Coldline / Archive', 'Tape / Object cold tier'),
    defaultConfig: { sizeGB: 5000 },
    tunables: [{ key: 'sizeGB', label: 'Size (GB)', type: 'number', min: 1 }],
    capacity: () => 100_000,
    monthlyCost: (c) => (c.sizeGB || 5000) * 0.0012,
    traits: { durable: true }
  },
  storage_gateway: {
    label: 'Hybrid Storage Gateway', category: 'Storage',
    tags: ['gateway', 'storage gateway', 'file gateway', 'hybrid'],
    description: 'On-prem storage front-end backed by cloud.',
    providers: p('Storage Gateway', 'Azure StorSimple / File Sync', 'Storage Transfer / gcsfuse', 'NAS Gateway'),
    defaultConfig: { cacheGB: 200 },
    tunables: [{ key: 'cacheGB', label: 'Local cache (GB)', type: 'number', min: 10 }],
    capacity: () => 10_000,
    monthlyCost: (c) => 100 + (c.cacheGB || 200) * 0.15,
    traits: { hybrid: true, managed: true }
  },
  backup_service: {
    label: 'Backup Service', category: 'Storage',
    tags: ['backup', 'aws backup', 'azure backup', 'dr'],
    description: 'Centralized backup and recovery orchestration.',
    providers: p('AWS Backup', 'Azure Backup / Site Recovery', 'Backup and DR', 'Veeam / Commvault'),
    defaultConfig: { retentionDays: 30, protectedGB: 1000 },
    tunables: [
      { key: 'retentionDays', label: 'Retention (days)', type: 'number', min: 1, max: 3650 },
      { key: 'protectedGB', label: 'Protected (GB)', type: 'number', min: 1 }
    ],
    capacity: () => 100_000,
    monthlyCost: (c) => 30 + (c.protectedGB || 1000) * 0.05,
    traits: { faultTolerance: true, managed: true }
  },
  data_transfer: {
    label: 'Data Transfer / Migration', category: 'Storage',
    tags: ['snowball', 'datasync', 'transfer family', 'migration'],
    description: 'Bulk / online data migration service.',
    providers: p('DataSync / Snowball / Transfer Family', 'Data Box / File Sync', 'Storage Transfer / Transfer Appliance', 'rsync / rclone'),
    defaultConfig: { tb: 10 },
    tunables: [{ key: 'tb', label: 'Data (TB)', type: 'number', min: 0.1, step: 0.5 }],
    capacity: () => 10000,
    monthlyCost: (c) => 50 + (c.tb || 10) * 30,
    traits: { managed: true, hybrid: true }
  },

  /* ═══════════════════════ ASYNC / INTEGRATION ═══════════════════════ */
  queue: {
    label: 'Message Queue', category: 'Async',
    tags: ['queue', 'sqs', 'service bus', 'pub/sub queue'],
    description: 'Durable point-to-point message queue.',
    providers: p('SQS', 'Service Bus / Storage Queues', 'Pub/Sub', 'RabbitMQ / ActiveMQ'),
    defaultConfig: { throughput: 5000, dlq: true },
    tunables: [
      { key: 'throughput', label: 'Msgs /s', type: 'number', min: 1 },
      { key: 'dlq', label: 'Dead-letter queue', type: 'boolean' }
    ],
    capacity: (c) => c.throughput || 5000,
    monthlyCost: (c) => 25 + (c.throughput || 5000) * 0.001,
    traits: { async: true, durable: true, managed: true }
  },
  event_bus: {
    label: 'Event Bus', category: 'Async',
    tags: ['event', 'eventbridge', 'event grid', 'eventarc'],
    description: 'Pub/sub event routing with filtering.',
    providers: p('EventBridge / SNS', 'Event Grid', 'Eventarc / Pub/Sub', 'NATS / Kafka topic'),
    defaultConfig: { throughput: 10000, fanout: 5 },
    tunables: [
      { key: 'throughput', label: 'Events /s', type: 'number', min: 1 },
      { key: 'fanout', label: 'Subscribers', type: 'number', min: 1, max: 100 }
    ],
    capacity: (c) => c.throughput || 10000,
    monthlyCost: (c) => 30 + (c.throughput || 10000) * 0.001,
    traits: { async: true, managed: true, fanOut: true }
  },
  stream: {
    label: 'Event Stream (Kafka)', category: 'Async',
    tags: ['kafka', 'kinesis', 'event hubs', 'msk', 'stream'],
    description: 'Durable, replayable event stream.',
    providers: p('Kinesis / MSK', 'Event Hubs', 'Pub/Sub Lite / Managed Kafka', 'Kafka / Redpanda'),
    defaultConfig: { partitions: 12, throughput: 50000, retentionHours: 168 },
    tunables: [
      { key: 'partitions', label: 'Partitions', type: 'number', min: 1, max: 1000 },
      { key: 'throughput', label: 'Msgs /s', type: 'number', min: 100 },
      { key: 'retentionHours', label: 'Retention (h)', type: 'number', min: 1, max: 8760 }
    ],
    capacity: (c) => c.throughput || 50000,
    monthlyCost: (c) => 80 + (c.partitions || 12) * 10 + (c.retentionHours || 168) * 0.2,
    traits: { async: true, durable: true, replayable: true }
  },
  mq_broker: {
    label: 'Managed MQ Broker', category: 'Async',
    tags: ['mq', 'amazon mq', 'service bus', 'rabbitmq', 'activemq'],
    description: 'Protocol-compatible message broker (AMQP/JMS).',
    providers: p('Amazon MQ', 'Service Bus Premium', 'Pub/Sub (with adapter) / RabbitMQ VM', 'RabbitMQ / ActiveMQ / IBM MQ'),
    defaultConfig: { instances: 2, msgsPerSec: 5000 },
    tunables: [
      { key: 'instances', label: 'Brokers', type: 'number', min: 1, max: 20 },
      { key: 'msgsPerSec', label: 'Msgs /s', type: 'number', min: 100 }
    ],
    capacity: (c) => (c.msgsPerSec || 5000) * (c.instances || 2),
    monthlyCost: (c) => (c.instances || 2) * 150,
    traits: { async: true, durable: true, managed: true }
  },
  workflow: {
    label: 'Workflow Orchestrator', category: 'Async',
    tags: ['workflow', 'step functions', 'durable functions', 'workflows', 'temporal'],
    description: 'Durable workflow / saga orchestration.',
    providers: p('Step Functions / SWF', 'Logic Apps / Durable Functions', 'Workflows / Composer', 'Temporal / Airflow'),
    defaultConfig: { workflowsPerSec: 100 },
    tunables: [{ key: 'workflowsPerSec', label: 'Workflows /s', type: 'number', min: 1 }],
    capacity: (c) => (c.workflowsPerSec || 100) * 10,
    monthlyCost: (c) => 60 + (c.workflowsPerSec || 100) * 0.5,
    traits: { async: true, managed: true }
  },
  integration_platform: {
    label: 'Integration Platform (iPaaS)', category: 'Async',
    tags: ['appflow', 'logic apps', 'application integration', 'ipaas'],
    description: 'Low-code SaaS-to-SaaS integration platform.',
    providers: p('AppFlow', 'Logic Apps', 'Application Integration / Apigee Integration', 'MuleSoft / Zapier self-host'),
    defaultConfig: { flowsPerMinute: 200 },
    tunables: [{ key: 'flowsPerMinute', label: 'Flows / min', type: 'number', min: 1 }],
    capacity: (c) => ((c.flowsPerMinute || 200) / 60) * 20,
    monthlyCost: (c) => 100 + (c.flowsPerMinute || 200) * 0.5,
    traits: { managed: true, async: true }
  },
  notification_service: {
    label: 'Notification Service', category: 'Async',
    tags: ['sns', 'notification hubs', 'push', 'sms'],
    description: 'Push / SMS / email fan-out to subscribers.',
    providers: p('SNS / Pinpoint', 'Notification Hubs / Communication Services', 'Firebase Cloud Messaging', 'Twilio / Firebase self-host'),
    defaultConfig: { messagesPerSec: 5000 },
    tunables: [{ key: 'messagesPerSec', label: 'Msgs /s', type: 'number', min: 1 }],
    capacity: (c) => c.messagesPerSec || 5000,
    monthlyCost: (c) => 20 + (c.messagesPerSec || 5000) * 0.0005,
    traits: { async: true, managed: true }
  },
  email_service: {
    label: 'Transactional Email', category: 'Async',
    tags: ['ses', 'email', 'smtp', 'transactional'],
    description: 'Managed transactional email delivery.',
    providers: p('SES', 'Communication Services Email', 'SendGrid on GCP', 'Postfix / MailHog'),
    defaultConfig: { emailsPerDay: 50000 },
    tunables: [{ key: 'emailsPerDay', label: 'Emails / day', type: 'number', min: 1 }],
    capacity: (c) => (c.emailsPerDay || 50000) / 86400 * 20,
    monthlyCost: (c) => 5 + (c.emailsPerDay || 50000) * 30 * 0.0001,
    traits: { async: true, managed: true }
  },

  /* ═══════════════════════ SECURITY / IDENTITY ═══════════════════════ */
  identity_provider: {
    label: 'Identity Provider', category: 'Security',
    tags: ['auth', 'oauth', 'oidc', 'cognito', 'entra', 'sso'],
    description: 'Identity, SSO, MFA.',
    providers: p('Cognito / IAM Identity Center', 'Entra ID (AAD) / B2C', 'Identity Platform / Cloud Identity', 'Keycloak / Auth0'),
    defaultConfig: { users: 100000, mfa: true },
    tunables: [
      { key: 'users', label: 'MAU', type: 'number', min: 1 },
      { key: 'mfa', label: 'MFA enforced', type: 'boolean' }
    ],
    capacity: () => 100_000,
    monthlyCost: (c) => 20 + (c.users || 100000) * 0.0055,
    traits: { security: true, managed: true }
  },
  iam: {
    label: 'IAM / Access Control', category: 'Security',
    tags: ['iam', 'rbac', 'permissions', 'access control'],
    description: 'Role-based access control for cloud resources.',
    providers: p('AWS IAM', 'Azure RBAC / Managed Identities', 'Cloud IAM', 'LDAP / Local RBAC'),
    defaultConfig: { roles: 20 },
    tunables: [{ key: 'roles', label: 'Roles / policies', type: 'number', min: 1 }],
    capacity: () => Infinity, monthlyCost: () => 0,
    traits: { security: true, governance: true }
  },
  directory_service: {
    label: 'Directory Service', category: 'Security',
    tags: ['directory', 'active directory', 'ldap'],
    description: 'Managed Active Directory / LDAP.',
    providers: p('AWS Directory Service / IAM IC', 'Entra Domain Services', 'Managed AD', 'Windows AD / OpenLDAP'),
    defaultConfig: { users: 10000 },
    tunables: [{ key: 'users', label: 'Users', type: 'number', min: 1 }],
    capacity: () => 100_000,
    monthlyCost: (c) => 30 + (c.users || 10000) * 0.02,
    traits: { security: true, managed: true }
  },
  conditional_access: {
    label: 'Conditional Access', category: 'Security',
    tags: ['conditional access', 'zero trust', 'policy'],
    description: 'Risk-based conditional access policies.',
    providers: p('IAM Access Analyzer + SCPs', 'Conditional Access (Entra)', 'BeyondCorp / IAP Policies', 'Custom policy engine'),
    defaultConfig: { policies: 10 },
    tunables: [{ key: 'policies', label: 'Policies', type: 'number', min: 1 }],
    capacity: () => Infinity, monthlyCost: (c) => 5 + (c.policies || 10) * 3,
    traits: { security: true, governance: true }
  },
  secret_manager: {
    label: 'Secret Manager', category: 'Security',
    tags: ['secret', 'vault', 'password', 'key vault'],
    description: 'Secure secrets storage & rotation.',
    providers: p('Secrets Manager', 'Key Vault', 'Secret Manager', 'HashiCorp Vault'),
    defaultConfig: { secrets: 100 },
    tunables: [{ key: 'secrets', label: 'Secrets', type: 'number', min: 1 }],
    capacity: () => 10_000,
    monthlyCost: (c) => 10 + (c.secrets || 100) * 0.4,
    traits: { security: true, managed: true }
  },
  kms: {
    label: 'KMS / HSM', category: 'Security',
    tags: ['kms', 'hsm', 'encryption', 'keys'],
    description: 'Cryptographic key management.',
    providers: p('KMS / CloudHSM', 'Key Vault HSM', 'Cloud KMS / HSM', 'HashiCorp Vault / SoftHSM'),
    defaultConfig: { keys: 10 },
    tunables: [{ key: 'keys', label: 'Keys', type: 'number', min: 1 }],
    capacity: () => 10_000,
    monthlyCost: (c) => 5 + (c.keys || 10) * 1,
    traits: { security: true, managed: true }
  },
  certificate_manager: {
    label: 'Certificate Manager', category: 'Security',
    tags: ['acm', 'certificate', 'tls', 'ssl'],
    description: 'Issue and rotate TLS certificates.',
    providers: p('ACM / Private CA', 'Key Vault Certs / App Service Managed Certs', 'Certificate Manager', 'Let\'s Encrypt / step-ca'),
    defaultConfig: { certs: 20 },
    tunables: [{ key: 'certs', label: 'Certificates', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => (c.certs || 20) * 0.75,
    traits: { security: true, managed: true }
  },
  threat_detection: {
    label: 'Threat Detection', category: 'Security',
    tags: ['guardduty', 'defender', 'security command center'],
    description: 'Continuous threat detection & anomaly analytics.',
    providers: p('GuardDuty / Detective', 'Defender for Cloud', 'Security Command Center', 'Wazuh / Falco'),
    defaultConfig: {}, tunables: [],
    capacity: () => Infinity, monthlyCost: () => 120,
    traits: { security: true, observability: true, managed: true }
  },
  security_hub: {
    label: 'Security Hub / Posture', category: 'Security',
    tags: ['security hub', 'defender', 'posture', 'compliance'],
    description: 'Aggregated security posture & compliance.',
    providers: p('Security Hub / Audit Manager', 'Defender for Cloud CSPM', 'Security Command Center Premium', 'Prowler / OpenSCAP'),
    defaultConfig: {}, tunables: [],
    capacity: () => Infinity, monthlyCost: () => 100,
    traits: { security: true, governance: true }
  },
  data_protection: {
    label: 'Data Protection / PII', category: 'Security',
    tags: ['macie', 'purview', 'dlp', 'pii'],
    description: 'PII discovery, classification, and DLP.',
    providers: p('Macie', 'Purview DLP', 'Cloud DLP / Sensitive Data Protection', 'Nightfall / OpenDLP'),
    defaultConfig: { scannedTB: 5 },
    tunables: [{ key: 'scannedTB', label: 'Scanned (TB/mo)', type: 'number', min: 0.1, step: 0.5 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 50 + (c.scannedTB || 5) * 30,
    traits: { security: true, governance: true }
  },
  vuln_scanner: {
    label: 'Vulnerability Scanner', category: 'Security',
    tags: ['inspector', 'defender for containers', 'scanning'],
    description: 'Scan hosts / containers / code for CVEs.',
    providers: p('Inspector', 'Defender for Containers / DevOps', 'Container Analysis / Artifact Analysis', 'Trivy / Anchore / Nessus'),
    defaultConfig: { scannedAssets: 100 },
    tunables: [{ key: 'scannedAssets', label: 'Scanned assets', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 40 + (c.scannedAssets || 100) * 0.6,
    traits: { security: true, devops: true }
  },

  /* ═══════════════════════ OBSERVABILITY ═══════════════════════ */
  metrics: {
    label: 'Metrics System', category: 'Observability',
    tags: ['metrics', 'prometheus', 'cloudwatch', 'monitoring'],
    description: 'Time-series metrics for infra & apps.',
    providers: p('CloudWatch Metrics', 'Azure Monitor Metrics', 'Cloud Monitoring', 'Prometheus'),
    defaultConfig: { seriesMillions: 5 },
    tunables: [{ key: 'seriesMillions', label: 'Series (M)', type: 'number', min: 0.1, step: 0.5 }],
    capacity: () => 100000,
    monthlyCost: (c) => 30 + (c.seriesMillions || 5) * 30,
    traits: { observability: true }
  },
  logging: {
    label: 'Log Aggregator', category: 'Observability',
    tags: ['log', 'log analytics', 'cloud logging', 'elk'],
    description: 'Centralized log collection & search.',
    providers: p('CloudWatch Logs / OpenSearch', 'Log Analytics Workspace (LAW)', 'Cloud Logging', 'ELK / Loki / Splunk'),
    defaultConfig: { ingestGBDay: 50 },
    tunables: [{ key: 'ingestGBDay', label: 'Ingest (GB/day)', type: 'number', min: 1 }],
    capacity: () => 100000,
    monthlyCost: (c) => 40 + (c.ingestGBDay || 50) * 2.5,
    traits: { observability: true }
  },
  tracing: {
    label: 'Distributed Tracing', category: 'Observability',
    tags: ['tracing', 'x-ray', 'app insights', 'cloud trace', 'otel'],
    description: 'Request tracing across services.',
    providers: p('X-Ray', 'Application Insights', 'Cloud Trace', 'Jaeger / Tempo'),
    defaultConfig: { spansPerSec: 10000 },
    tunables: [{ key: 'spansPerSec', label: 'Spans /s', type: 'number', min: 100 }],
    capacity: () => 100000,
    monthlyCost: (c) => 30 + (c.spansPerSec || 10000) * 0.002,
    traits: { observability: true }
  },
  profiler: {
    label: 'Profiler', category: 'Observability',
    tags: ['profiler', 'codeguru', 'cloud profiler', 'apm'],
    description: 'Continuous CPU / memory profiling.',
    providers: p('CodeGuru Profiler', 'Application Insights Profiler', 'Cloud Profiler', 'Pyroscope / Parca'),
    defaultConfig: {}, tunables: [],
    capacity: () => Infinity, monthlyCost: () => 40,
    traits: { observability: true }
  },
  alerting: {
    label: 'Alerting / On-call', category: 'Observability',
    tags: ['alert', 'pagerduty', 'oncall'],
    description: 'Alert routing and on-call.',
    providers: p('SNS + Incident Manager / Chatbot', 'Azure Monitor Alerts', 'Cloud Monitoring Alerts', 'PagerDuty / OpsGenie'),
    defaultConfig: {}, tunables: [],
    capacity: () => 100000, monthlyCost: () => 25,
    traits: { observability: true }
  },
  incident_response: {
    label: 'Chatbot / ChatOps', category: 'Observability',
    tags: ['chatbot', 'slack', 'chatops'],
    description: 'Alerts and incident collaboration in chat.',
    providers: p('AWS Chatbot', 'Teams / Azure Bot Service', 'Google Chat + Cloud Functions', 'Slack / Rocket.Chat'),
    defaultConfig: {}, tunables: [],
    capacity: () => Infinity, monthlyCost: () => 10,
    traits: { observability: true }
  },
  network_analyzer: {
    label: 'Network Analyzer', category: 'Observability',
    tags: ['network watcher', 'flow logs', 'vpc flow'],
    description: 'Packet capture / flow log analysis.',
    providers: p('VPC Flow Logs / Reachability Analyzer', 'Network Watcher', 'VPC Flow Logs / Network Intelligence Center', 'ntopng / Wireshark'),
    defaultConfig: {}, tunables: [],
    capacity: () => Infinity, monthlyCost: () => 60,
    traits: { observability: true, network: true }
  },

  /* ═══════════════════════ ML / AI ═══════════════════════ */
  model_serving: {
    label: 'Model Serving', category: 'ML/AI',
    tags: ['ml', 'inference', 'sagemaker', 'vertex ai', 'foundry'],
    description: 'Real-time model inference endpoint.',
    providers: p('SageMaker Endpoint / Bedrock', 'Azure ML Endpoint / Foundry', 'Vertex AI Endpoint', 'Triton / TorchServe'),
    defaultConfig: { instances: 2, rpsPerInstance: 100, gpu: false },
    tunables: [
      { key: 'instances', label: 'Instances', type: 'number', min: 1, max: 200 },
      { key: 'rpsPerInstance', label: 'RPS / instance', type: 'number', min: 1 },
      { key: 'gpu', label: 'GPU-backed', type: 'boolean' }
    ],
    capacity: (c) => (c.instances || 1) * (c.rpsPerInstance || 100),
    monthlyCost: (c) => (c.instances || 1) * (c.gpu ? 900 : 120),
    traits: { compute: true, ml: true }
  },
  ml_training: {
    label: 'ML Training', category: 'ML/AI',
    tags: ['sagemaker training', 'vertex training', 'databricks', 'training'],
    description: 'Managed model training jobs.',
    providers: p('SageMaker Training', 'Azure ML Compute / Databricks', 'Vertex AI Training', 'Kubeflow / Ray'),
    defaultConfig: { gpuHours: 100 },
    tunables: [{ key: 'gpuHours', label: 'GPU-hours / month', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => (c.gpuHours || 100) * 4,
    traits: { compute: true, ml: true, elastic: true }
  },
  feature_store: {
    label: 'Feature Store', category: 'ML/AI',
    tags: ['features', 'ml', 'feast'],
    description: 'Online + offline features for ML.',
    providers: p('SageMaker Feature Store', 'Azure ML Feature Store', 'Vertex Feature Store', 'Feast'),
    defaultConfig: { features: 1000 },
    tunables: [{ key: 'features', label: 'Features', type: 'number', min: 10 }],
    capacity: () => 10000,
    monthlyCost: (c) => 80 + (c.features || 1000) * 0.05,
    traits: { ml: true, stateful: true }
  },
  automl: {
    label: 'AutoML', category: 'ML/AI',
    tags: ['automl', 'no-code ml', 'forecast'],
    description: 'Automated model training on tabular / text / vision data.',
    providers: p('SageMaker Canvas / Forecast', 'Azure ML AutoML', 'Vertex AutoML', 'AutoGluon / H2O'),
    defaultConfig: { experimentsPerMonth: 10 },
    tunables: [{ key: 'experimentsPerMonth', label: 'Experiments / mo', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 100 + (c.experimentsPerMonth || 10) * 30,
    traits: { ml: true, managed: true }
  },
  vision_ai: {
    label: 'Vision AI', category: 'ML/AI',
    tags: ['vision', 'rekognition', 'computer vision', 'ocr'],
    description: 'Pre-trained image + video analysis APIs.',
    providers: p('Rekognition', 'Computer Vision / Custom Vision', 'Vision AI / Video Intelligence', 'YOLO / OpenCV self-host'),
    defaultConfig: { callsPerSec: 100 },
    tunables: [{ key: 'callsPerSec', label: 'Calls /s', type: 'number', min: 1 }],
    capacity: (c) => c.callsPerSec || 100,
    monthlyCost: (c) => 30 + (c.callsPerSec || 100) * 1.5,
    traits: { ml: true, managed: true }
  },
  speech_ai: {
    label: 'Speech AI', category: 'ML/AI',
    tags: ['speech', 'transcribe', 'polly', 'speech to text'],
    description: 'Speech-to-text / text-to-speech APIs.',
    providers: p('Transcribe / Polly', 'Speech Services', 'Speech-to-Text / Text-to-Speech', 'Whisper / Coqui self-host'),
    defaultConfig: { minutesPerDay: 5000 },
    tunables: [{ key: 'minutesPerDay', label: 'Minutes / day', type: 'number', min: 1 }],
    capacity: (c) => (c.minutesPerDay || 5000) / 1440 * 10,
    monthlyCost: (c) => 20 + (c.minutesPerDay || 5000) * 30 * 0.006,
    traits: { ml: true, managed: true }
  },
  translation_ai: {
    label: 'Translation AI', category: 'ML/AI',
    tags: ['translate', 'translation'],
    description: 'Neural machine translation APIs.',
    providers: p('Translate', 'Azure Translator', 'Translation AI', 'MarianNMT / OPUS'),
    defaultConfig: { charsPerMonthMil: 5 },
    tunables: [{ key: 'charsPerMonthMil', label: 'Chars (M) / mo', type: 'number', min: 0.1, step: 0.5 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 15 + (c.charsPerMonthMil || 5) * 20,
    traits: { ml: true, managed: true }
  },
  nlp_ai: {
    label: 'NLP AI', category: 'ML/AI',
    tags: ['comprehend', 'text analytics', 'natural language'],
    description: 'Entity, sentiment, PII extraction from text.',
    providers: p('Comprehend', 'Azure Text Analytics', 'Natural Language AI', 'spaCy / HuggingFace'),
    defaultConfig: { docsPerDay: 10000 },
    tunables: [{ key: 'docsPerDay', label: 'Docs / day', type: 'number', min: 1 }],
    capacity: (c) => (c.docsPerDay || 10000) / 86400 * 20,
    monthlyCost: (c) => 20 + (c.docsPerDay || 10000) * 30 * 0.0003,
    traits: { ml: true, managed: true }
  },
  chatbot: {
    label: 'Conversational AI', category: 'ML/AI',
    tags: ['lex', 'bot service', 'dialogflow', 'chatbot'],
    description: 'Managed conversational agents.',
    providers: p('Lex / Bedrock Agents', 'Azure Bot Service / Copilot Studio', 'Dialogflow / Vertex Agents', 'Rasa / Botpress'),
    defaultConfig: { conversationsPerDay: 5000 },
    tunables: [{ key: 'conversationsPerDay', label: 'Conversations / day', type: 'number', min: 1 }],
    capacity: (c) => (c.conversationsPerDay || 5000) / 86400 * 10,
    monthlyCost: (c) => 40 + (c.conversationsPerDay || 5000) * 30 * 0.005,
    traits: { ml: true, managed: true }
  },
  llm_service: {
    label: 'LLM / Foundation Model', category: 'ML/AI',
    tags: ['llm', 'bedrock', 'openai', 'gemini', 'foundry'],
    description: 'Managed LLM / foundation model API.',
    providers: p('Bedrock', 'Azure OpenAI / Foundry', 'Gemini on Vertex AI', 'Ollama / vLLM self-host'),
    defaultConfig: { tokensPerMonthMil: 10 },
    tunables: [{ key: 'tokensPerMonthMil', label: 'Tokens (M) / mo', type: 'number', min: 0.1, step: 0.5 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 50 + (c.tokensPerMonthMil || 10) * 25,
    traits: { ml: true, managed: true }
  },

  /* ═══════════════════════ IoT ═══════════════════════ */
  iot_core: {
    label: 'IoT Core / Ingest', category: 'IoT',
    tags: ['iot', 'core', 'mqtt', 'ingest'],
    description: 'Managed device ingest + shadow + rules.',
    providers: p('IoT Core / IoT 1-Click', 'IoT Hub', 'IoT Core', 'EMQX / Mosquitto'),
    defaultConfig: { devices: 100000, msgsPerSec: 5000 },
    tunables: [
      { key: 'devices', label: 'Devices', type: 'number', min: 1 },
      { key: 'msgsPerSec', label: 'Msgs /s', type: 'number', min: 1 }
    ],
    capacity: (c) => c.msgsPerSec || 5000,
    monthlyCost: (c) => 40 + (c.devices || 100000) * 0.0005,
    traits: { iot: true, managed: true, async: true }
  },
  iot_device_mgmt: {
    label: 'IoT Device Management', category: 'IoT',
    tags: ['ota', 'device management', 'fleet', 'iot defender'],
    description: 'Fleet provisioning, OTA firmware, device defender.',
    providers: p('IoT Device Management / Defender', 'IoT Hub Device Provisioning / Central', 'IoT Device Manager', 'Balena / Mender'),
    defaultConfig: { devices: 100000 },
    tunables: [{ key: 'devices', label: 'Managed devices', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 60 + (c.devices || 100000) * 0.001,
    traits: { iot: true, managed: true, security: true }
  },
  iot_events: {
    label: 'IoT Rules / Events', category: 'IoT',
    tags: ['iot events', 'rules', 'analytics'],
    description: 'Stateful device event detection + routing.',
    providers: p('IoT Events / IoT Analytics', 'IoT Hub Message Routing / Stream Analytics', 'IoT Core Rules + Pub/Sub', 'Node-RED / Kafka Streams'),
    defaultConfig: { eventsPerSec: 5000 },
    tunables: [{ key: 'eventsPerSec', label: 'Events /s', type: 'number', min: 1 }],
    capacity: (c) => c.eventsPerSec || 5000,
    monthlyCost: (c) => 40 + (c.eventsPerSec || 5000) * 0.002,
    traits: { iot: true, async: true }
  },
  iot_edge: {
    label: 'IoT Edge Runtime', category: 'IoT',
    tags: ['greengrass', 'iot edge', 'edge runtime'],
    description: 'On-device runtime for edge compute + local ML.',
    providers: p('Greengrass / FreeRTOS', 'IoT Edge', 'Edge for Anthos', 'K3s / BalenaOS'),
    defaultConfig: { gateways: 100 },
    tunables: [{ key: 'gateways', label: 'Edge gateways', type: 'number', min: 1 }],
    capacity: (c) => (c.gateways || 100) * 500,
    monthlyCost: (c) => 30 + (c.gateways || 100) * 1.2,
    traits: { iot: true, edge: true }
  },
  iot_sitewise: {
    label: 'Industrial Data Platform', category: 'IoT',
    tags: ['sitewise', 'opc-ua', 'industrial', 'digital twin'],
    description: 'Ingest & model industrial / OT telemetry.',
    providers: p('IoT SiteWise / TwinMaker', 'Azure Digital Twins', 'Digital Twins on Vertex', 'Ignition / Node-RED'),
    defaultConfig: { assets: 500 },
    tunables: [{ key: 'assets', label: 'Modeled assets', type: 'number', min: 1 }],
    capacity: () => 100000,
    monthlyCost: (c) => 100 + (c.assets || 500) * 0.5,
    traits: { iot: true, managed: true }
  },

  /* ═══════════════════════ MEDIA ═══════════════════════ */
  media_pipeline: {
    label: 'Media Transcoding', category: 'Media',
    tags: ['transcoder', 'elemental', 'media convert', 'ffmpeg'],
    description: 'Transcode / package video assets.',
    providers: p('Elastic Transcoder / MediaConvert', 'Media Services Encoder', 'Transcoder API', 'FFmpeg / Bento4'),
    defaultConfig: { minutesPerMonth: 5000 },
    tunables: [{ key: 'minutesPerMonth', label: 'Minutes / mo', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 40 + (c.minutesPerMonth || 5000) * 0.02,
    traits: { async: true, managed: true }
  },
  live_streaming: {
    label: 'Live Video Streaming', category: 'Media',
    tags: ['live', 'medialive', 'streaming', 'ivs'],
    description: 'Ingest + package + deliver live video.',
    providers: p('MediaLive / IVS / MediaPackage', 'Media Services Live Streaming', 'Live Stream API', 'Wowza / Nimble Streamer'),
    defaultConfig: { channels: 3 },
    tunables: [{ key: 'channels', label: 'Concurrent channels', type: 'number', min: 1, max: 500 }],
    capacity: (c) => (c.channels || 3) * 5000,
    monthlyCost: (c) => 200 + (c.channels || 3) * 300,
    traits: { managed: true, edge: true }
  },
  video_on_demand: {
    label: 'Video on Demand', category: 'Media',
    tags: ['vod', 'mediastore', 'mediatailor', 'streaming'],
    description: 'VOD origin storage + dynamic ad insertion.',
    providers: p('MediaStore / MediaTailor', 'Media Services Streaming Endpoint', 'Cloud Storage + CDN + Ad Manager', 'Origin server + Ad server'),
    defaultConfig: { hoursPerMonth: 20000 },
    tunables: [{ key: 'hoursPerMonth', label: 'View hours / mo', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 100 + (c.hoursPerMonth || 20000) * 0.01,
    traits: { managed: true, edge: true }
  },
  video_analytics: {
    label: 'Video Analytics', category: 'Media',
    tags: ['kinesis video', 'video intelligence', 'analytics'],
    description: 'Real-time and stored video ML analytics.',
    providers: p('Kinesis Video Streams + Rekognition', 'Video Indexer', 'Video Intelligence API', 'DeepStream / OpenVINO'),
    defaultConfig: { hoursPerMonth: 1000 },
    tunables: [{ key: 'hoursPerMonth', label: 'Hours / mo', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 60 + (c.hoursPerMonth || 1000) * 0.5,
    traits: { ml: true, managed: true }
  },

  /* ═══════════════════════ DEVOPS ═══════════════════════ */
  ci_cd: {
    label: 'CI/CD Pipeline', category: 'DevOps',
    tags: ['ci', 'cd', 'codepipeline', 'github actions', 'devops pipelines', 'cloud build'],
    description: 'Continuous integration and deployment.',
    providers: p('CodePipeline / CodeBuild / CodeDeploy', 'Azure DevOps Pipelines / GitHub Actions', 'Cloud Build / Cloud Deploy', 'Jenkins / GitLab CI / Tekton'),
    defaultConfig: { buildsPerDay: 200 },
    tunables: [{ key: 'buildsPerDay', label: 'Builds / day', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 50 + (c.buildsPerDay || 200) * 0.05,
    traits: { devops: true, managed: true }
  },
  source_repo: {
    label: 'Source Repository', category: 'DevOps',
    tags: ['git', 'codecommit', 'repos', 'github'],
    description: 'Managed Git hosting.',
    providers: p('CodeCommit', 'Azure Repos / GitHub Enterprise', 'Cloud Source Repositories / GitHub', 'GitLab / Gitea'),
    defaultConfig: { repos: 50 },
    tunables: [{ key: 'repos', label: 'Repos', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 10 + (c.repos || 50) * 0.5,
    traits: { devops: true, managed: true }
  },
  artifact_repo: {
    label: 'Artifact Repository', category: 'DevOps',
    tags: ['artifacts', 'nexus', 'artifact registry', 'packages'],
    description: 'Binary artifact / package repository.',
    providers: p('CodeArtifact / ECR', 'Azure Artifacts / ACR', 'Artifact Registry', 'Nexus / JFrog Artifactory'),
    defaultConfig: { storageGB: 200 },
    tunables: [{ key: 'storageGB', label: 'Storage (GB)', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 10 + (c.storageGB || 200) * 0.1,
    traits: { devops: true, managed: true }
  },
  iac: {
    label: 'Infrastructure as Code', category: 'DevOps',
    tags: ['iac', 'cloudformation', 'bicep', 'terraform', 'deployment manager'],
    description: 'Declarative infrastructure provisioning.',
    providers: p('CloudFormation / CDK', 'ARM / Bicep', 'Deployment Manager / Config Connector', 'Terraform / Pulumi'),
    defaultConfig: { stacks: 10 },
    tunables: [{ key: 'stacks', label: 'Stacks / modules', type: 'number', min: 1 }],
    capacity: () => Infinity, monthlyCost: () => 0,
    traits: { devops: true, governance: true }
  },
  runbook_automation: {
    label: 'Automation / Runbooks', category: 'DevOps',
    tags: ['automation', 'runbook', 'systems manager', 'ssm'],
    description: 'Operational runbook execution.',
    providers: p('Systems Manager Automation', 'Automation Accounts / Runbooks', 'Cloud Ops Automation / Workflows', 'Ansible / Rundeck'),
    defaultConfig: { runbooks: 20 },
    tunables: [{ key: 'runbooks', label: 'Runbooks', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 20 + (c.runbooks || 20) * 0.8,
    traits: { devops: true, managed: true }
  },
  cloud_ide: {
    label: 'Cloud IDE', category: 'DevOps',
    tags: ['cloud9', 'ide', 'codespaces', 'workstations'],
    description: 'Browser-based developer environment.',
    providers: p('Cloud9', 'GitHub Codespaces', 'Cloud Workstations', 'Coder / Gitpod self-host'),
    defaultConfig: { seats: 10 },
    tunables: [{ key: 'seats', label: 'Seats', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => (c.seats || 10) * 30,
    traits: { devops: true, managed: true }
  },
  device_farm: {
    label: 'Mobile Device Farm', category: 'DevOps',
    tags: ['device farm', 'app center test', 'testing'],
    description: 'Test on real mobile devices in the cloud.',
    providers: p('Device Farm', 'App Center Test', 'Firebase Test Lab', 'BrowserStack / Sauce Labs'),
    defaultConfig: { minutesPerMonth: 1000 },
    tunables: [{ key: 'minutesPerMonth', label: 'Device minutes / mo', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 30 + (c.minutesPerMonth || 1000) * 0.17,
    traits: { devops: true, managed: true }
  },

  /* ═══════════════════════ END-USER / CUSTOMER ═══════════════════════ */
  virtual_desktop: {
    label: 'Virtual Desktop', category: 'End-User',
    tags: ['workspaces', 'avd', 'vdi'],
    description: 'Managed virtual desktops (VDI).',
    providers: p('WorkSpaces', 'Azure Virtual Desktop / Windows 365', 'Chrome Enterprise + VDI', 'Citrix / Horizon'),
    defaultConfig: { seats: 50 },
    tunables: [{ key: 'seats', label: 'Seats', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => (c.seats || 50) * 45,
    traits: { managed: true }
  },
  app_streaming: {
    label: 'App Streaming', category: 'End-User',
    tags: ['appstream', 'application streaming'],
    description: 'Stream desktop apps to browsers.',
    providers: p('AppStream 2.0', 'Windows 365 App Streaming', 'Chrome Enterprise Streaming', 'Citrix Virtual Apps'),
    defaultConfig: { seats: 20 },
    tunables: [{ key: 'seats', label: 'Seats', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => (c.seats || 20) * 25,
    traits: { managed: true }
  },
  doc_collab: {
    label: 'Document Collaboration', category: 'End-User',
    tags: ['workdocs', 'sharepoint', 'workspace'],
    description: 'Enterprise document collaboration.',
    providers: p('WorkDocs (retired) / Chime', 'SharePoint / OneDrive', 'Google Workspace Drive', 'Nextcloud'),
    defaultConfig: { users: 500 },
    tunables: [{ key: 'users', label: 'Users', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => (c.users || 500) * 5,
    traits: { managed: true }
  },

  /* ═══════════════════════ GOVERNANCE / COST ═══════════════════════ */
  governance_policy: {
    label: 'Policy / Governance', category: 'Governance',
    tags: ['organizations', 'policy', 'blueprints', 'org policies', 'scp'],
    description: 'Org-wide guardrails, SCPs, config compliance.',
    providers: p('Organizations / Control Tower / Config', 'Azure Policy / Blueprints / Management Groups', 'Organization Policies / Policy Controller', 'OPA / Gatekeeper'),
    defaultConfig: { policies: 20 },
    tunables: [{ key: 'policies', label: 'Policies', type: 'number', min: 1 }],
    capacity: () => Infinity, monthlyCost: (c) => 20 + (c.policies || 20) * 2,
    traits: { governance: true, security: true }
  },
  resource_manager: {
    label: 'Resource Manager', category: 'Governance',
    tags: ['tags', 'resource groups', 'asset inventory'],
    description: 'Resource organization + asset inventory.',
    providers: p('Resource Groups / Resource Explorer / AWS Config', 'Resource Manager / Resource Graph', 'Resource Manager / Asset Inventory', 'CMDB'),
    defaultConfig: {}, tunables: [],
    capacity: () => Infinity, monthlyCost: () => 15,
    traits: { governance: true, managed: true }
  },
  audit_trail: {
    label: 'Audit / Activity Log', category: 'Governance',
    tags: ['cloudtrail', 'audit logs', 'activity log'],
    description: 'Immutable audit trail of API calls.',
    providers: p('CloudTrail', 'Activity Log / Diagnostic Settings', 'Cloud Audit Logs', 'Syslog / SIEM'),
    defaultConfig: { retentionDays: 365 },
    tunables: [{ key: 'retentionDays', label: 'Retention (days)', type: 'number', min: 30, max: 3650 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 20 + (c.retentionDays || 365) * 0.05,
    traits: { governance: true, security: true, observability: true }
  },
  cost_management: {
    label: 'Cost Management', category: 'Governance',
    tags: ['cost explorer', 'billing', 'budgets', 'finops'],
    description: 'Spend analysis, budgets, and forecasting.',
    providers: p('Cost Explorer / Budgets / Compute Optimizer', 'Cost Management + Billing / Advisor', 'Billing / Recommender', 'CloudHealth / Kubecost'),
    defaultConfig: { budgets: 10 },
    tunables: [{ key: 'budgets', label: 'Budgets', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: () => 0,
    traits: { governance: true, managed: true }
  },
  well_arch: {
    label: 'Well-Architected Advisor', category: 'Governance',
    tags: ['well architected', 'advisor', 'trusted advisor'],
    description: 'Best-practice recommendations for cost / security / reliability.',
    providers: p('Well-Architected Tool / Trusted Advisor', 'Azure Advisor', 'Active Assist / Recommender', 'Prowler / ScoutSuite'),
    defaultConfig: {}, tunables: [],
    capacity: () => Infinity, monthlyCost: () => 0,
    traits: { governance: true, managed: true }
  },
  compliance_manager: {
    label: 'Compliance Manager', category: 'Governance',
    tags: ['compliance', 'audit manager', 'compliance manager'],
    description: 'Continuous compliance evidence & controls.',
    providers: p('Audit Manager / Artifact', 'Compliance Manager / Purview Compliance', 'Assured Workloads', 'Vanta / Drata self-host'),
    defaultConfig: { frameworks: 3 },
    tunables: [{ key: 'frameworks', label: 'Frameworks', type: 'number', min: 1 }],
    capacity: () => Infinity,
    monthlyCost: (c) => 100 + (c.frameworks || 3) * 60,
    traits: { governance: true, security: true }
  },
  license_manager: {
    label: 'License Manager', category: 'Governance',
    tags: ['license', 'marketplace', 'byol'],
    description: 'Manage BYOL and marketplace licenses.',
    providers: p('License Manager / Marketplace', 'Azure Marketplace / Hybrid Benefit', 'Marketplace', 'FlexNet / Manual'),
    defaultConfig: {}, tunables: [],
    capacity: () => Infinity, monthlyCost: () => 20,
    traits: { governance: true, managed: true }
  }
};

export function specFor(type) {
  return COMPONENT_SPECS[type];
}

export function listComponents() {
  return Object.entries(COMPONENT_SPECS).map(([type, s]) => ({
    type,
    label: s.label,
    category: s.category,
    tags: s.tags,
    description: s.description,
    providers: s.providers,
    defaultConfig: s.defaultConfig,
    tunables: s.tunables,
    traits: s.traits || {}
  }));
}

export function hasTrait(node, key) {
  const spec = specFor(node.type);
  return !!spec?.traits?.[key];
}
