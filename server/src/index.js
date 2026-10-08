import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import designsRouter from './routes/designs.js';
import evaluateRouter from './routes/evaluate.js';
import analyzeRouter from './routes/analyze.js';
import { listComponents } from './engine/components.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '16mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/components', (_req, res) => res.json(listComponents()));

app.use('/api/designs', designsRouter);
app.use('/api/evaluate', evaluateRouter);
app.use('/api/analyze-image', analyzeRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API listening on :${PORT}`)))
  .catch((e) => {
    console.warn('MongoDB unavailable, starting API without persistence:', e.message);
    app.listen(PORT, () => console.log(`API (no DB) listening on :${PORT}`));
  });
