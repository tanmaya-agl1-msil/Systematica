import { Router } from 'express';
import { analyzeImage, aiStatus } from '../ai/vision.js';
import { normalizeGraph } from '../ai/normalize.js';
import { layoutByTier } from '../engine/layout.js';
import { evaluateDesign } from '../engine/index.js';

const router = Router();

const MAX_BYTES = 12 * 1024 * 1024;
const DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/;

router.get('/status', (_req, res) => res.json(aiStatus()));

router.post('/', async (req, res, next) => {
  try {
    const { image } = req.body || {};
    if (typeof image !== 'string' || !DATA_URL.test(image)) {
      return res.status(400).json({ error: 'Provide a base64 PNG/JPEG/WebP data URL in "image".' });
    }
    const bytes = Math.floor((image.length - image.indexOf(',') - 1) * 0.75);
    if (bytes > MAX_BYTES) {
      return res.status(413).json({ error: `Image too large (${(bytes / 1e6).toFixed(1)} MB). Max 12 MB.` });
    }

    const rawGraph = await analyzeImage(image);
    const graph = normalizeGraph(rawGraph);

    if (!graph.nodes.length) {
      return res.status(422).json({
        error: 'No recognizable architecture components found in that image.',
        unmapped: graph.unmapped
      });
    }

    graph.nodes = layoutByTier(graph.nodes, graph.edges);
    const report = evaluateDesign({ nodes: graph.nodes, edges: graph.edges });

    res.json({ ...graph, report });
  } catch (e) {
    next(e);
  }
});

export default router;
