import 'dotenv/config';
import app from './app.js';
import config from './config/index.js';
import { connectDB } from './config/db.js';
import { seed } from './seed.js';

async function start() {
  // Listen first: Hostinger kills apps that don't call listen() within 3 seconds, and connecting
  // to Atlas can take longer. Mongoose queues queries from early requests until it's connected.
  app.listen(config.port, () => console.log(`API running on http://localhost:${config.port}`));
  await connectDB();
  await seed();
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
