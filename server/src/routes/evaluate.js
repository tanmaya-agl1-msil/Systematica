import { Router } from 'express';
import { evaluateDesign } from '../engine/index.js';

const router = Router();

router.post('/', (req, res) => {
  const { nodes = [], edges = [] } = req.body || {};
  const report = evaluateDesign({ nodes, edges });
  res.json(report);
});

export default router;
