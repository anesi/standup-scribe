/**
 * Delivery Worker
 *
 * This worker is started from the deliveries/index.ts module
 * which exports startDeliveryWorker()
 *
 * The worker:
 * - Runs every minute
 * - Fetches jobs where status in (PENDING, RETRYING) and nextAttemptAt <= now
 * - Attempts delivery
 * - On success: status = SUCCESS
 * - On failure: increment attemptCount, calculate backoff, set RETRYING or FAILED
 */

import { processDeliveryJobs, startDeliveryWorker } from '../deliveries';

// The worker is started from src/index.ts
export { startDeliveryWorker };

// Process jobs immediately (for manual triggering)
export async function runDeliveryWorkerOnce(): Promise<void> {
  await processDeliveryJobs();
}
