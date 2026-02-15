"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeliveryHandlers = registerDeliveryHandlers;
exports.enqueueDeliveries = enqueueDeliveries;
exports.processDeliveryJobs = processDeliveryJobs;
exports.startDeliveryWorker = startDeliveryWorker;
exports.resendDelivery = resendDelivery;
const database_1 = require("@standup-scribe/database");
const constants_1 = require("@standup-scribe/core/dist/src/utils/constants");
const luxon_1 = require("luxon");
// Import platform-specific delivery functions
// These will be provided by the platform adapters
let publishDiscordReport = null;
let publishSlackReport = null;
// Import integration delivery functions
const sheets_1 = require("./sheets");
const notion_1 = require("./notion");
const csv_1 = require("./csv");
/**
 * Register platform-specific delivery functions
 */
function registerDeliveryHandlers(handlers) {
    if (handlers.discord !== undefined) {
        publishDiscordReport = handlers.discord;
    }
    if (handlers.slack !== undefined) {
        publishSlackReport = handlers.slack;
    }
}
/**
 * Enqueue delivery jobs for a closed run
 */
async function enqueueDeliveries(workspaceId, runId) {
    const config = await database_1.prisma.workspaceConfig.findUnique({
        where: { workspaceId },
    });
    if (!config) {
        throw new Error('Workspace not configured');
    }
    const destinations = [];
    // Add platform-specific delivery
    if (config.platformType === 'DISCORD') {
        destinations.push('DISCORD');
    }
    else if (config.platformType === 'SLACK') {
        destinations.push('SLACK');
    }
    // Add integration deliveries
    if (config.googleSpreadsheetId) {
        destinations.push('SHEETS');
    }
    if (config.notionParentPageId) {
        destinations.push('NOTION');
    }
    destinations.push('CSV');
    // Create delivery jobs
    for (const destination of destinations) {
        await database_1.prisma.deliveryJob.create({
            data: {
                runId,
                destination,
                status: 'PENDING',
                attemptCount: 0,
                nextAttemptAt: new Date(),
            },
        });
    }
}
/**
 * Process pending delivery jobs
 */
async function processDeliveryJobs() {
    const jobs = await database_1.prisma.deliveryJob.findMany({
        where: {
            status: { in: ['PENDING', 'RETRYING'] },
            nextAttemptAt: { lte: new Date() },
        },
        include: {
            run: {
                include: {
                    responses: {
                        include: {
                            rosterMember: true,
                        },
                    },
                    workspace: true,
                },
            },
        },
        orderBy: {
            createdAt: 'asc',
        },
        take: 10, // Process max 10 jobs per tick
    });
    for (const job of jobs) {
        await processDeliveryJob(job);
    }
}
async function processDeliveryJob(job) {
    console.log(`Processing delivery job: ${job.destination} for run ${job.runId}`);
    try {
        switch (job.destination) {
            case 'DISCORD':
                if (!publishDiscordReport) {
                    throw new Error('Discord delivery handler not registered');
                }
                await publishDiscordReport(job.run);
                break;
            case 'SLACK':
                if (!publishSlackReport) {
                    throw new Error('Slack delivery handler not registered');
                }
                await publishSlackReport(job.run);
                break;
            case 'SHEETS':
                await (0, sheets_1.publishSheetsReport)(job.run);
                break;
            case 'NOTION':
                await (0, notion_1.publishNotionReport)(job.run);
                break;
            case 'CSV':
                await (0, csv_1.generateCSV)(job.run);
                break;
        }
        // Mark as successful
        await database_1.prisma.deliveryJob.update({
            where: { id: job.id },
            data: {
                status: 'SUCCESS',
                completedAt: new Date(),
            },
        });
        console.log(`✅ Delivery job ${job.id} (${job.destination}) completed successfully`);
    }
    catch (error) {
        console.error(`❌ Delivery job ${job.id} (${job.destination}) failed:`, error);
        const newAttemptCount = job.attemptCount + 1;
        const isLastAttempt = newAttemptCount >= constants_1.MAX_DELIVERY_ATTEMPTS;
        // Calculate backoff
        const backoffIndex = Math.min(job.attemptCount, constants_1.BACKOFF_SCHEDULE.length - 1);
        const backoffMinutes = constants_1.BACKOFF_SCHEDULE[backoffIndex];
        const nextAttemptAt = luxon_1.DateTime.now().plus({ minutes: backoffMinutes }).toJSDate();
        await database_1.prisma.deliveryJob.update({
            where: { id: job.id },
            data: {
                status: isLastAttempt ? 'FAILED' : 'RETRYING',
                attemptCount: newAttemptCount,
                nextAttemptAt,
                lastError: error instanceof Error ? error.message : String(error),
            },
        });
        if (isLastAttempt) {
            console.error(`Delivery job ${job.id} permanently failed after ${constants_1.MAX_DELIVERY_ATTEMPTS} attempts`);
        }
        else {
            console.log(`Delivery job ${job.id} will retry in ${backoffMinutes} minutes`);
        }
    }
}
/**
 * Start the delivery worker
 */
function startDeliveryWorker() {
    console.log('Starting delivery worker...');
    // Run immediately
    processDeliveryJobs().catch((err) => console.error('Delivery worker error:', err));
    // Then run every minute
    return setInterval(() => {
        processDeliveryJobs().catch((err) => console.error('Delivery worker error:', err));
    }, 60 * 1000);
}
/**
 * Resend a delivery job
 */
async function resendDelivery(workspaceId, runDate, destination) {
    const run = await database_1.prisma.standupRun.findUnique({
        where: {
            workspaceId_runDate: {
                workspaceId,
                runDate,
            },
        },
    });
    if (!run) {
        throw new Error('Run not found');
    }
    const where = {
        runId: run.id,
        status: { in: ['FAILED', 'RETRYING'] },
    };
    if (destination) {
        where.destination = destination;
    }
    const result = await database_1.prisma.deliveryJob.updateMany({
        where,
        data: {
            status: 'PENDING',
            attemptCount: 0,
            nextAttemptAt: new Date(),
            lastError: null,
        },
    });
    return result.count;
}
//# sourceMappingURL=delivery-worker.js.map