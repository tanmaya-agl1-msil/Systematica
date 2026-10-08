// Verify the configured vision model is reachable and returns usable JSON.
//   node scripts/test-vision.mjs            -> synthetic test diagram
//   node scripts/test-vision.mjs my-arch.png -> your own image
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { aiStatus, analyzeImage } from '../src/ai/vision.js';
import { normalizeGraph } from '../src/ai/normalize.js';
import { layoutByTier } from '../src/engine/layout.js';
import { evaluateDesign } from '../src/engine/index.js';

// 3-box diagram: Users -> API Gateway -> PostgreSQL, drawn as a tiny PNG-free SVG->data URL.
const SYNTHETIC = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="200">
  <rect width="760" height="200" fill="#fff"/>
  <g stroke="#111" stroke-width="2" fill="none">
    <rect x="20"  y="60" width="180" height="70"/>
    <rect x="290" y="60" width="180" height="70"/>
    <rect x="560" y="60" width="180" height="70"/>
    <line x1="200" y1="95" x2="285" y2="95" marker-end="url(#a)"/>
    <line x1="470" y1="95" x2="555" y2="95" marker-end="url(#a)"/>
  </g>
  <defs><marker id="a" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
    <polygon points="0 0, 10 3.5, 0 7" fill="#111"/></marker></defs>
  <g font-family="Arial" font-size="18" text-anchor="middle" fill="#111">
    <text x="110" y="100">Web Users</text>
    <text x="380" y="100">API Gateway</text>
    <text x="650" y="100">PostgreSQL</text>
  </g>
</svg>`;

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function loadImage(path) {
  if (!path) {
    return 'data:image/svg+xml;base64,' + Buffer.from(SYNTHETIC).toString('base64');
  }
  const mime = MIME[extname(path).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image type: ${path}`);
  return `data:${mime};base64,` + readFileSync(path).toString('base64');
}

const status = aiStatus();
console.log('── AI config ──');
console.log('  provider :', status.provider);
console.log('  baseUrl  :', status.baseUrl);
console.log('  model    :', status.model);
console.log('  local    :', status.local);
console.log('  ready    :', status.ready);
if (!status.ready) {
  console.error('\n✗ Not configured. Set AI_API_KEY (or point AI_BASE_URL at localhost) in server/.env');
  process.exit(1);
}

const file = process.argv[2];
console.log('\n── Sending', file || '(synthetic 3-box diagram)', '──');
const started = Date.now();

try {
  const raw = await analyzeImage(loadImage(file));
  const graph = normalizeGraph(raw);
  graph.nodes = layoutByTier(graph.nodes, graph.edges);
  const report = evaluateDesign({ nodes: graph.nodes, edges: graph.edges });

  console.log(`✓ Responded in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
  console.log('  title    :', graph.title || '(none)');
  console.log('  nodes    :', graph.nodes.length);
  graph.nodes.forEach((n) => console.log('      -', (n.data.label || '').padEnd(32), '->', n.type));
  console.log('  edges    :', graph.edges.length);
  graph.edges.forEach((e) => console.log('      -', e.source, '->', e.target));
  if (graph.warnings.length) console.log('  warnings :', graph.warnings);
  if (graph.unmapped.length) console.log('  unmapped :', graph.unmapped);
  console.log('\n  score    :', report.summary.overall, report.summary.grade);
  console.log('  cost     : $' + report.summary.monthlyCost + '/mo');
  console.log('  findings :', report.findings.length);
  console.log('\n✓ Pipeline healthy — the Import image button will work.');
} catch (e) {
  console.error(`\n✗ Failed after ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.error('  ' + e.message);
  process.exit(1);
}
