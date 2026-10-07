import dns from 'node:dns';
import mongoose from 'mongoose';
import config from './index.js';

export async function connectDB(uri = config.mongoUri) {
  // Some Windows setups leave Node with an unusable resolver (127.0.0.1), which breaks
  // the SRV lookup behind mongodb+srv:// URIs. DNS_SERVERS overrides it.
  if (config.dnsServers.length > 0) dns.setServers(config.dnsServers);

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
