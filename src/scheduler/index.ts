import { DateTime } from 'luxon';
import { prisma } from '../lib/prisma';
import { runStandup, sendReminders, closeStandup } from './standup-runner';

/**
 * Main scheduler - should run every minute
 */
export async function tickScheduler(): Promise<void> {
  const configs = await prisma.workspaceConfig.findMany({
    where: {
      // Only process active configs
      managementChannelId: { not: '' },
    },
  });

  for (const config of configs) {
    try {
      await processGuild(config);
    } catch (error) {
      console.error(`Error processing guild ${config.guildId}:`, error);
    }
  }
}

async function processGuild(config: any): Promise<void> {
  const now = DateTime.now().setZone(config.timezone);
  const currentTime = now.toFormat('HH:mm');

  // Check if it's a weekday (Monday = 1, Friday = 5)
  const weekday = now.weekday;
  const isWeekday = weekday >= 1 && weekday <= 5;

  if (!isWeekday) {
    return; // Skip weekends
  }

  // Open standup at window open time
  if (currentTime === config.windowOpenTime) {
    console.log(`[${config.guildId}] Opening standup at ${currentTime}`);
    await runStandup(config.guildId).catch((err) =>
      console.error(`Failed to open standup:`, err),
    );
  }

  // Send reminders at reminder times
  if (config.reminderTimes.includes(currentTime)) {
    console.log(`[${config.guildId}] Sending reminders at ${currentTime}`);
    await sendReminders(config.guildId).catch((err) =>
      console.error(`Failed to send reminders:`, err),
    );
  }

  // Close standup at window close time
  if (currentTime === config.windowCloseTime) {
    console.log(`[${config.guildId}] Closing standup at ${currentTime}`);
    await closeStandup(config.guildId).catch((err) =>
      console.error(`Failed to close standup:`, err),
    );
  }
}

/**
 * Start the scheduler - runs every minute
 */
export function startScheduler(): NodeJS.Timeout {
  console.log('Starting standup scheduler...');

  // Run immediately to check for any pending actions
  tickScheduler().catch((err) => console.error('Scheduler error:', err));

  // Then run every minute
  return setInterval(
    () => {
      tickScheduler().catch((err) => console.error('Scheduler error:', err));
    },
    60 * 1000,
  );
}
