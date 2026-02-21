import { writeFile } from 'node:fs/promises';
import { buildApp } from '../app.js';

async function main(): Promise<void> {
  const app = buildApp();
  await app.ready();
  const spec =
    typeof (app as { swagger?: () => unknown }).swagger === 'function'
      ? (app as { swagger: () => unknown }).swagger()
      : {
          openapi: '3.0.0',
          info: {
            title: 'Anylical Engine API',
            version: '0.1.0',
            description: 'Fallback OpenAPI spec generated without swagger plugin binding.',
          },
          paths: {},
        };
  await writeFile('openapi.json', JSON.stringify(spec, null, 2), 'utf-8');
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
