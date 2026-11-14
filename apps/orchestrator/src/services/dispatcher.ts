/**
 * Microservice Dispatcher: Coordinates RPC calls to:
 * - Physics Worker (:8001/physics)
 * - Optimizer Worker (:8002/optimize)
 */

export interface DispatcherConfig {
  physicsUrl: string;
  optimizerUrl: string;
}

const DEFAULT_CONFIG: DispatcherConfig = {
  physicsUrl: process.env.PHYSICS_WORKER_URL || 'http://localhost:8001',
  optimizerUrl: process.env.OPTIMIZER_WORKER_URL || 'http://localhost:8002'
};

export async function callPhysicsWorker(
  bundle: Record<string, unknown>,
  config = DEFAULT_CONFIG
): Promise<Record<string, unknown>> {
  const url = `${config.physicsUrl}/physics`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Physics worker HTTP ${res.status}: ${errorText}`);
  }

  return (await res.json()) as Record<string, unknown>;
}

export async function callOptimizerWorker(
  payload: Record<string, unknown>,
  config = DEFAULT_CONFIG
): Promise<Record<string, unknown>> {
  const url = `${config.optimizerUrl}/optimize`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Optimizer worker HTTP ${res.status}: ${errorText}`);
  }

  return (await res.json()) as Record<string, unknown>;
}
