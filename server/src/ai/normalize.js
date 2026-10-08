import { COMPONENT_SPECS, listComponents } from '../engine/components.js';

const SPECS = listComponents();
const VALID = new Set(Object.keys(COMPONENT_SPECS));

// Fallback keyword map for when the model returns a type outside the catalog.
const KEYWORD_FALLBACK = [
  [/mongo|cosmos|dynamo|documentdb|couchbase|firestore/i, 'nosql_db'],
  [/cassandra|bigtable|scylla|hbase|keyspaces/i, 'wide_column_db'],
  [/redshift|synapse|bigquery|snowflake|clickhouse|warehouse|golden layer/i, 'data_warehouse'],
  [/data lake|landing zone|staging layer|iceberg|delta lake|adls|lakehouse/i, 'data_lake'],
  [/\bs3\b|blob storage|cloud storage|object storage|minio|bucket/i, 'object_storage'],
  [/sql server|oracle|postgres|postgre|mysql|mariadb|aurora|rds|\brdbms\b|relational/i, 'sql_db'],
  [/redis|memcach|elasticache|memorystore|\bcache\b/i, 'cache'],
  [/kafka|kinesis|event hub|pub\/?sub lite|redpanda|stream/i, 'stream'],
  [/\bsqs\b|rabbit|activemq|service bus|message queue|\bqueue\b/i, 'queue'],
  [/eventbridge|event grid|eventarc|event bus|\bsns\b(?!.*push)/i, 'event_bus'],
  [/airflow|glue|qlik|informatica|data factory|dataflow|\betl\b|data pipeline|data transformation|ingestion|rpa bot/i, 'etl_service'],
  [/step function|durable function|temporal|orchestrat|workflow|\bsaga\b/i, 'workflow'],
  [/elasticsearch|opensearch|solr|lucene|cognitive search|search engine/i, 'search_engine'],
  [/pinecone|milvus|weaviate|vector|embedding/i, 'vector_db'],
  [/neo4j|neptune|gremlin|graph db/i, 'graph_db'],
  [/influx|timescale|timestream|time.?series/i, 'timeseries_db'],
  [/\bwaf\b|web application firewall|modsecurity|cloud armor/i, 'waf'],
  [/ddos|shield/i, 'ddos_protection'],
  [/apim|api manage|api gateway|apigee|\bkong\b|tyk/i, 'api_gateway'],
  [/ingress|nginx|haproxy|application gateway|\balb\b|app gateway|load balanc/i, 'load_balancer_l7'],
  [/\bnlb\b|network load|layer 4|\bl4\b/i, 'load_balancer_l4'],
  [/cloudfront|front door|cloudflare|akamai|fastly|\bcdn\b|edge cache/i, 'cdn'],
  [/route ?53|\bdns\b|traffic manager/i, 'dns'],
  [/vpc peering|private link|expressroute|direct connect|\bvpn\b|ipsec|site.to.site/i, 'vpn'],
  [/\bvpc\b|\bvnet\b|virtual network|virtual private cloud/i, 'vpc'],
  [/security group|\bnsg\b|network firewall|\bfirewall\b|iptables|palo alto/i, 'firewall'],
  [/service mesh|istio|linkerd|\bmtls\b|envoy|sidecar/i, 'service_mesh'],
  [/\bsso\b|oidc|oauth|\botp\b|entra|cognito|okta|keycloak|auth0|identity provider|\bidp\b/i, 'identity_provider'],
  [/token auth|\bacl\b|\brbac\b|access management|access control|\biam\b|permission/i, 'iam'],
  [/key vault|secret manager|secrets manager|hashicorp vault|\bsecrets?\b/i, 'secret_manager'],
  [/\bkms\b|\bhsm\b|encryption key|key management/i, 'kms'],
  [/certificate|\bacm\b|\btls\b cert|ssl cert|let'?s encrypt/i, 'certificate_manager'],
  [/guardduty|defender for cloud|security command|threat detect|wazuh|falco/i, 'threat_detection'],
  [/\bmacie\b|purview dlp|\bdlp\b|\bpii\b|data protection/i, 'data_protection'],
  [/inspector|trivy|anchore|nessus|vulnerab|cve scan/i, 'vuln_scanner'],
  [/cloudtrail|audit log|access log|activity log|audit trail|audit &/i, 'audit_trail'],
  [/grafana|prometheus|cloudwatch metric|azure monitor|metric|dashboards?\b(?=.*ops)|monitoring/i, 'metrics'],
  [/\belk\b|splunk|\bloki\b|log analytic|cloud logging|logging|\blogs?\b/i, 'logging'],
  [/jaeger|tempo|x-?ray|app(lication)? insights|cloud trace|tracing|opentelemetry|\botel\b/i, 'tracing'],
  [/pagerduty|opsgenie|alerting|on-?call|alerts?\b/i, 'alerting'],
  [/jenkins|github action|azure devops|codepipeline|cloud build|gitlab ci|tekton|ci\/?cd|pipeline(?!.*data)/i, 'ci_cd'],
  [/\bgit\b|github|bitbucket|codecommit|source repo|repos\b/i, 'source_repo'],
  [/terraform|cloudformation|bicep|\barm\b template|pulumi|\biac\b|infrastructure as code/i, 'iac'],
  [/\becr\b|\bacr\b|artifact registry|harbor|nexus|artifactory|container registry/i, 'container_registry'],
  [/lambda|azure function|cloud function|serverless|\bfaas\b|trigger/i, 'serverless_fn'],
  [/kubernetes|\bk8s\b|\beks\b|\baks\b|\bgke\b|openshift|container orchestr/i, 'container_orchestrator'],
  [/background worker|consumer|celery|sidekiq|\bworker\b|data processing/i, 'worker'],
  [/scheduled job|cron|timer|batch trigger|nightly/i, 'client_batch'],
  [/\bbatch\b|\bhpc\b|slurm/i, 'batch_compute'],
  [/\bec2\b|virtual machine|compute engine|\bvm\b|windows server|bare metal/i, 'vm'],
  [/app service|beanstalk|app engine|app runner|heroku|\bpaas\b/i, 'paas_web'],
  [/push notification|\bfcm\b|notification hub|apns/i, 'notification_service'],
  [/\bsmtp\b|\bses\b|sendgrid|transactional email|\bemail\b/i, 'email_service'],
  [/chatbot|conversational|\blex\b|dialogflow|bot service|chat widget|assistant/i, 'chatbot'],
  [/bedrock|azure openai|\bllm\b|\bgpt\b|gemini|foundation model|model gateway|token limit/i, 'llm_service'],
  [/sagemaker endpoint|vertex ai endpoint|inference|model serving|recommendation engine|triton/i, 'model_serving'],
  [/feature store|\bfeast\b/i, 'feature_store'],
  [/\bautoml\b/i, 'automl'],
  [/rekognition|computer vision|\bocr\b|vision ai/i, 'vision_ai'],
  [/transcribe|\bpolly\b|speech/i, 'speech_ai'],
  [/comprehend|text analytics|\bnlp\b|natural language/i, 'nlp_ai'],
  [/\befs\b|\bfsx\b|azure files|filestore|\bnfs\b|\bsmb\b|file share|file storage|storage folder/i, 'file_storage'],
  [/\bebs\b|managed disk|persistent disk|block storage|\bsan\b/i, 'block_storage'],
  [/glacier|archive|coldline|cold tier|\btape\b/i, 'archive_storage'],
  [/aws backup|azure backup|site recovery|veeam|commvault|backup/i, 'backup_service'],
  [/iot hub|iot core|\bmqtt\b/i, 'iot_core'],
  [/greengrass|iot edge/i, 'iot_edge'],
  [/react native|android|\bios\b|mobile app|flutter|\bapp\b(?=.*store)/i, 'client_mobile'],
  [/third.?party|external vendor|other vendor|partner|\bb2b\b|external system/i, 'client_partner'],
  [/web portal|website|micro.?frontend|\breact\b|angular|\bvue\b|browser|web app|\bspa\b|end user|persona|dealer|auditor|customer|\buser\b/i, 'client_web'],
  [/cost explorer|budget|billing|finops|cost manage/i, 'cost_management'],
  [/azure policy|organizations|control tower|blueprint|governance|org polic/i, 'governance_policy'],
  [/compliance/i, 'compliance_manager'],
  [/api\b|service\b|micro.?service|engine\b|calculation|computation|simulator|gateway logic|\brest\b|fastapi|\.net|spring/i, 'api']
];

function guessType(text) {
  if (!text) return null;
  for (const [re, type] of KEYWORD_FALLBACK) {
    if (re.test(text) && VALID.has(type)) return type;
  }
  return null;
}

const clean = (v, max = 120) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

// Keep only config keys the component actually declares, coerced to the right type.
function sanitizeConfig(type, raw) {
  const spec = COMPONENT_SPECS[type];
  if (!spec || !raw || typeof raw !== 'object') return {};
  const allowed = new Map((spec.tunables || []).map((t) => [t.key, t]));
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const t = allowed.get(k);
    if (!t) continue;
    if (t.type === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      out[k] = Math.min(t.max ?? Number.MAX_SAFE_INTEGER, Math.max(t.min ?? 0, n));
    } else if (t.type === 'boolean') {
      out[k] = typeof v === 'boolean' ? v : /^(true|yes|1|enabled)$/i.test(String(v));
    } else if (t.type === 'select') {
      if ((t.options || []).includes(v)) out[k] = v;
    }
  }
  return out;
}

// Coerce raw model output into the exact node/edge schema the engine expects.
export function normalizeGraph(ai) {
  const unmapped = Array.isArray(ai?.unmapped) ? ai.unmapped.map((u) => clean(u)).filter(Boolean) : [];
  const notes = Array.isArray(ai?.notes) ? ai.notes.map((n) => clean(n, 200)).filter(Boolean) : [];
  const warnings = [];

  const idMap = new Map();
  const nodes = [];
  const seenIds = new Set();

  for (const raw of Array.isArray(ai?.nodes) ? ai.nodes : []) {
    const label = clean(raw?.label) || clean(raw?.name);
    let type = clean(raw?.type);

    if (!VALID.has(type)) {
      const guessed = guessType(`${type} ${label} ${clean(raw?.group)}`);
      if (guessed) {
        warnings.push(`"${label || type}" → mapped to ${guessed} (model said "${type}")`);
        type = guessed;
      } else {
        if (label || type) unmapped.push(label || type);
        continue;
      }
    }

    const origId = clean(raw?.id) || `${type}_${nodes.length}`;
    let id = origId.replace(/[^\w-]/g, '_');
    while (seenIds.has(id)) id = `${id}_${nodes.length}`;
    seenIds.add(id);
    idMap.set(origId, id);

    nodes.push({
      id,
      type,
      position: { x: 0, y: 0 },
      data: {
        label: label || COMPONENT_SPECS[type].label,
        group: clean(raw?.group, 60) || undefined,
        config: sanitizeConfig(type, raw?.config)
      }
    });
  }

  const alive = new Set(nodes.map((n) => n.id));
  const edges = [];
  const seenEdges = new Set();

  for (const raw of Array.isArray(ai?.edges) ? ai.edges : []) {
    const s = idMap.get(clean(raw?.source)) || clean(raw?.source).replace(/[^\w-]/g, '_');
    const t = idMap.get(clean(raw?.target)) || clean(raw?.target).replace(/[^\w-]/g, '_');
    if (!alive.has(s) || !alive.has(t) || s === t) continue;
    const key = `${s}->${t}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push({ id: `e_${s}__${t}`, source: s, target: t, label: clean(raw?.label, 40) || undefined });
  }

  return {
    title: clean(ai?.title, 80),
    nodes,
    edges,
    unmapped: [...new Set(unmapped)],
    notes,
    warnings
  };
}

export { SPECS };
