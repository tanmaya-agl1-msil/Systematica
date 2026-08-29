import { Router } from 'express';
import mongoose from 'mongoose';
import Design from '../models/Design.js';
import { evaluateDesign } from '../engine/index.js';

const router = Router();

function dbReady(res) {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: 'MongoDB not connected' });
    return false;
  }
  return true;
}

router.get('/', async (_req, res, next) => {
  if (!dbReady(res)) return;
  try {
    const list = await Design.find({}, 'name description updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  if (!dbReady(res)) return;
  try {
    const doc = await Design.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  if (!dbReady(res)) return;
  try {
    const { name, description = '', nodes = [], edges = [] } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const lastReport = evaluateDesign({ nodes, edges });
    const doc = await Design.create({ name, description, nodes, edges, lastReport });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  if (!dbReady(res)) return;
  try {
    const { name, description, nodes, edges } = req.body || {};
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (nodes !== undefined) patch.nodes = nodes;
    if (edges !== undefined) patch.edges = edges;
    if (nodes && edges) patch.lastReport = evaluateDesign({ nodes, edges });
    const doc = await Design.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true
    });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  if (!dbReady(res)) return;
  try {
    const doc = await Design.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
