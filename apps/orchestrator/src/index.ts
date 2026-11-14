/**
 * Orchestrator Entrypoint — Starts Fastify server on port 3000.
 */

import { buildServer } from './server.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const app = buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`[NASA Agro-DSS] Orchestrator Gateway running at http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('Failed to start orchestrator:', err);
    process.exit(1);
  }
}

main();
