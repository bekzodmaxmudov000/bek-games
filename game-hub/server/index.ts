import { fileURLToPath } from 'node:url';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';
const origins = process.env.ALLOWED_ORIGINS;

const app = createApp({
  dataDir: process.env.DATA_DIR ?? fileURLToPath(new URL('./data', import.meta.url)),
  allowedOrigins: origins ? origins.split(',').map((s) => s.trim()).filter(Boolean) : '*',
  trustProxy: process.env.TRUST_PROXY === '1',
});

app.listen(port, host).then((p) => {
  console.log(`BEK GAMES multiplayer server listening on ${host}:${p}`);
  if (!origins) console.log('ALLOWED_ORIGINS is not set: any website may call this server. Set it in production.');
});

const stop = () => { app.close().finally(() => process.exit(0)); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
