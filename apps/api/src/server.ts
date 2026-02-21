import { env } from './config/env.js';
import { buildApp } from './app.js';

async function start(): Promise<void> {
  const app = buildApp();

  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    app.log.info(`API gateway listening on ${env.API_PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
