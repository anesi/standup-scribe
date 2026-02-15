import { Destination } from '@prisma/client';
/**
 * Register platform-specific delivery functions
 */
export declare function registerDeliveryHandlers(handlers: {
    discord?: ((run: any) => Promise<void>) | null;
    slack?: ((run: any) => Promise<void>) | null;
}): void;
/**
 * Enqueue delivery jobs for a closed run
 */
export declare function enqueueDeliveries(workspaceId: string, runId: string): Promise<void>;
/**
 * Process pending delivery jobs
 */
export declare function processDeliveryJobs(): Promise<void>;
/**
 * Start the delivery worker
 */
export declare function startDeliveryWorker(): NodeJS.Timeout;
/**
 * Resend a delivery job
 */
export declare function resendDelivery(workspaceId: string, runDate: Date, destination?: Destination): Promise<number>;
//# sourceMappingURL=delivery-worker.d.ts.map