import 'dotenv/config';
import app from './app.js';
import config from './config/index.js';
import { connectDB } from './config/db.js';
import { seedRewards } from './seed.js';

async function start() {
  await connectDB();
  await seedRewards();
  app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
