import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import config from './config/index.js';
import authRoutes from './routes/auth.js';
import spinRoutes from './routes/spin.js';

const app = express();

app.use(cors({ origin: config.clientOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/config', (req, res) => {
  res.json({ whatsappNumber: config.whatsappNumber, brandName: config.brandName });
});

app.use('/api/auth', authRoutes);
app.use('/api', spinRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Serve the built React app in production (client/dist)
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong, please try again' });
});

export default app;
