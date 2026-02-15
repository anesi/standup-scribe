import { prisma } from '../lib/prisma';
import { DateTime } from 'luxon';

/**
 * Cleanup Worker - Deletes old records based on retention policy
 *
 * Runs daily to remove records older than retentionDays
 */

const CLEANUP_HOUR = 2; // 2 AM

export async function runCleanup(): Promise<void> {
  console.log('Running cleanup worker...');

  const configs = await prisma.workspaceConfig.findMany();

  for (const config of configs) {
    try {
      const retentionDays = config.retentionDays || 1825; // Default 5 years
      const cutoffDate = DateTime.now().minus({ days: retentionDays }).toJSDate();

      // Delete old delivery jobs
      const deletedJobs = await prisma.deliveryJob.deleteMany({
        where: {
          run: {
            guildId: config.guildId,
            createdAt: { lt: cutoffDate },
          },
        },
      });

      // Delete old responses (cascade will handle this via runs)
      const deletedRuns = await prisma.standupRun.deleteMany({
        where: {
          guildId: config.guildId,
          createdAt: { lt: cutoffDate },
        },
      });

      // Delete old excusals
      const deletedExcusals = await prisma.excusal.deleteMany({
        where: {
          endDate: { lt: cutoffDate },
          rosterMember: {
            guildId: config.guildId,
          },
        },
      });

      console.log(
        `[${config.guildId}] Cleanup completed: ${deletedRuns.count} runs, ${deletedJobs.count} jobs, ${deletedExcusals.count} excusals deleted`,
      );
    } catch (error) {
      console.error(`[${config.guildId}] Cleanup error:`, error);
    }
  }
}

/**
 * Start the cleanup worker - runs once daily
 */
export function startCleanupWorker(): NodeJS.Timeout {
  console.log('Starting cleanup worker...');

  // Check every hour if it's time to run cleanup
  return setInterval(
    () => {
      const now = DateTime.now();
      if (now.hour === CLEANUP_HOUR && now.minute === 0) {
        runCleanup().catch((err) => console.error('Cleanup worker error:', err));
      }
    },
    60 * 1000, // Check every minute
  );
}
