import { prisma } from '../lib/prisma';
import { publishDiscordReport } from './discord';
import { publishSheetsReport } from './sheets';
import { publishNotionReport } from './notion';
import { generateCSV } from './csv';
import { BACKOFF_SCHEDULE, MAX_DELIVERY_ATTEMPTS } from '../utils/constants';
import { DateTime } from 'luxon';
import { Destination } from '@prisma/client';

/**
 * Enqueue delivery jobs for a closed run
 */
export async function enqueueDeliveries(guildId: string, runId: string): Promise<void> {
  const config = await prisma.workspaceConfig.findUnique({
    where: { guildId },
  });

  if (!config) {
    throw new Error('Workspace not configured');
  }

  const destinations: Destination[] = ['DISCORD'];

  if (config.googleSpreadsheetId) {
    destinations.push('SHEETS');
  }

  if (config.notionParentPageId) {
    destinations.push('NOTION');
  }

  destinations.push('CSV');

  // Create delivery jobs
  for (const destination of destinations) {
    await prisma.deliveryJob.create({
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
export async function processDeliveryJobs(): Promise<void> {
  const jobs = await prisma.deliveryJob.findMany({
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
          guild: true,
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

async function processDeliveryJob(job: any): Promise<void> {
  console.log(`Processing delivery job: ${job.destination} for run ${job.runId}`);

  try {
    switch (job.destination) {
      case 'DISCORD':
        await publishDiscordReport(job.run);
        break;
      case 'SHEETS':
        await publishSheetsReport(job.run);
        break;
      case 'NOTION':
        await publishNotionReport(job.run);
        break;
      case 'CSV':
        await generateCSV(job.run);
        break;
    }

    // Mark as successful
    await prisma.deliveryJob.update({
      where: { id: job.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
      },
    });

    console.log(`✅ Delivery job ${job.id} (${job.destination}) completed successfully`);
  } catch (error) {
    console.error(`❌ Delivery job ${job.id} (${job.destination}) failed:`, error);

    const newAttemptCount = job.attemptCount + 1;
    const isLastAttempt = newAttemptCount >= MAX_DELIVERY_ATTEMPTS;

    // Calculate backoff
    const backoffIndex = Math.min(job.attemptCount, BACKOFF_SCHEDULE.length - 1);
    const backoffMinutes = BACKOFF_SCHEDULE[backoffIndex];
    const nextAttemptAt = DateTime.now().plus({ minutes: backoffMinutes }).toJSDate();

    await prisma.deliveryJob.update({
      where: { id: job.id },
      data: {
        status: isLastAttempt ? 'FAILED' : 'RETRYING',
        attemptCount: newAttemptCount,
        nextAttemptAt,
        lastError: error instanceof Error ? error.message : String(error),
      },
    });

    if (isLastAttempt) {
      console.error(`Delivery job ${job.id} permanently failed after ${MAX_DELIVERY_ATTEMPTS} attempts`);
    } else {
      console.log(`Delivery job ${job.id} will retry in ${backoffMinutes} minutes`);
    }
  }
}

/**
 * Start the delivery worker
 */
export function startDeliveryWorker(): NodeJS.Timeout {
  console.log('Starting delivery worker...');

  // Run immediately
  processDeliveryJobs().catch((err) => console.error('Delivery worker error:', err));

  // Then run every minute
  return setInterval(
    () => {
      processDeliveryJobs().catch((err) => console.error('Delivery worker error:', err));
    },
    60 * 1000,
  );
}

/**
 * Resend a delivery job
 */
export async function resendDelivery(
  guildId: string,
  runDate: Date,
  destination?: Destination,
): Promise<number> {
  const run = await prisma.standupRun.findUnique({
    where: {
      guildId_runDate: {
        guildId,
        runDate,
      },
    },
  });

  if (!run) {
    throw new Error('Run not found');
  }

  const where: any = {
    runId: run.id,
    status: { in: ['FAILED', 'RETRYING'] },
  };

  if (destination) {
    where.destination = destination;
  }

  const result = await prisma.deliveryJob.updateMany({
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
