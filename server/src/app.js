import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import config from './config/index.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import siteRoutes from './routes/site.js';
import spinRoutes from './routes/spin.js';

const app = express();

// Behind nginx / a hosting proxy, so req.ip is the visitor's IP (used by the rate limiters)
app.set('trust proxy', 1);
app.use(cors({ origin: config.clientOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', siteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', spinRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Serve the built React app in production (client/dist). /admin is handled by the same app.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  // Vite gives built JS/CSS hashed names, so they can be cached forever
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
  app.use(express.static(clientDist, { index: false }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'That file is too large. Please use an image under 6 MB.' });
  }
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: 'Invalid request' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong, please try again' });
});

export default app;
