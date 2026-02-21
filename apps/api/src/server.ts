import { env } from './config/env.js';
import { buildApp } from './app.js';

async function start(): Promise<void> {
  const app = buildApp();
  const port = env.PORT ?? env.API_PORT;

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API gateway listening on ${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
