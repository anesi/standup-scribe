/**
 * Delivery Worker Stub
 *
 * The actual delivery worker implementation is in the integrations package.
 * This file is kept for backward compatibility.
 *
 * Import from @standup-scribe/integrations instead:
 * import { startDeliveryWorker } from '@standup-scribe/integrations';
 */

// Re-export from integrations package at runtime
export async function startDeliveryWorker(): Promise<NodeJS.Timeout> {
  const { startDeliveryWorker: _startDeliveryWorker } = await import('@standup-scribe/integrations/dist');
  return _startDeliveryWorker();
}

export async function processDeliveryJobs(): Promise<void> {
  const { processDeliveryJobs: _processDeliveryJobs } = await import('@standup-scribe/integrations/dist');
  await _processDeliveryJobs();
}

export async function enqueueDeliveries(workspaceId: string, runId: string): Promise<void> {
  const { enqueueDeliveries: _enqueueDeliveries } = await import('@standup-scribe/integrations/dist');
  await _enqueueDeliveries(workspaceId, runId);
}

export async function resendDelivery(
  workspaceId: string,
  runDate: Date,
  destination?: any,
): Promise<number> {
  const { resendDelivery: _resendDelivery } = await import('@standup-scribe/integrations/dist');
  return _resendDelivery(workspaceId, runDate, destination);
}

export function registerDeliveryHandlers(handlers: any): void {
  // This is a noop here, the actual registration happens in the platform adapters
}

// Process jobs immediately (for manual triggering)
export async function runDeliveryWorkerOnce(): Promise<void> {
  await processDeliveryJobs();
}
