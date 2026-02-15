import { prisma } from '../lib/prisma';
import { DateTime } from 'luxon';
import { discordClient } from '../clients/discord';
import { enqueueDeliveries } from '../deliveries';

/**
 * Run a standup - create run, send DMs to active roster members
 */
export async function runStandup(guildId: string): Promise<void> {
  const config = await prisma.workspaceConfig.findUnique({
    where: { guildId },
    include: {
      rosterMembers: {
        where: { isActive: true },
        include: { excusals: true },
      },
    },
  });

  if (!config) {
    throw new Error('Workspace not configured');
  }

  const now = DateTime.now().setZone(config.timezone);
  const runDate = now.startOf('day');

  // Check if run already exists
  const existingRun = await prisma.standupRun.findUnique({
    where: {
      guildId_runDate: {
        guildId,
        runDate: runDate.toJSDate(),
      },
    },
  });

  if (existingRun && existingRun.status !== 'OPEN') {
    throw new Error('Standup for today is not open');
  }

  // Create or get run
  const run = await prisma.standupRun.upsert({
    where: {
      guildId_runDate: {
        guildId,
        runDate: runDate.toJSDate(),
      },
    },
    create: {
      guildId,
      runDate: runDate.toJSDate(),
      status: 'OPEN',
    },
    update: {},
  });

  const client = discordClient.getRawClient();

  // Process each roster member
  for (const member of config.rosterMembers) {
    // Check if excused today
    const isExcused = member.excusals.some(
      (excusal) =>
        runDate >= DateTime.fromJSDate(excusal.startDate).startOf('day') &&
        runDate <= DateTime.fromJSDate(excusal.endDate).endOf('day'),
    );

    if (isExcused) {
      // Mark as excused
      await prisma.standupResponse.upsert({
        where: {
          runId_rosterMemberId: {
            runId: run.id,
            rosterMemberId: member.id,
          },
        },
        create: {
          runId: run.id,
          rosterMemberId: member.id,
          status: 'EXCUSED',
          answers: {},
        },
        update: {
          status: 'EXCUSED',
        },
      });
      continue;
    }

    try {
      // Send DM
      const user = await client.users.fetch(member.userId);
      const dmChannel = await user.createDM();

      await dmChannel.send({
        content:
          `👋 Good morning! It's standup time!\n\n` +
          `Please complete your standup by **${config.windowCloseTime} ${config.timezone}**.\n\n` +
          `Click the button below to start your standup.`,
        components: [
          {
            type: 1, // ActionRow
            components: [
              {
                type: 2, // Button
                style: 1, // Primary
                label: 'Start Standup',
                customId: `standup_start_${member.id}_${run.id}`,
              },
            ],
          },
        ],
      });

      // Create PENDING response
      await prisma.standupResponse.upsert({
        where: {
          runId_rosterMemberId: {
            runId: run.id,
            rosterMemberId: member.id,
          },
        },
        create: {
          runId: run.id,
          rosterMemberId: member.id,
          status: 'PENDING',
          answers: {},
        },
        update: {
          status: 'PENDING',
          dmError: null,
        },
      });
    } catch (error) {
      console.error(`Failed to DM user ${member.userId}:`, error);
      await prisma.standupResponse.upsert({
        where: {
          runId_rosterMemberId: {
            runId: run.id,
            rosterMemberId: member.id,
          },
        },
        create: {
          runId: run.id,
          rosterMemberId: member.id,
          status: 'DM_FAILED',
          dmError: error instanceof Error ? error.message : String(error),
          answers: {},
        },
        update: {
          status: 'DM_FAILED',
          dmError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}

/**
 * Send reminders to users who haven't submitted
 */
export async function sendReminders(guildId: string): Promise<void> {
  const config = await prisma.workspaceConfig.findUnique({
    where: { guildId },
  });

  if (!config) {
    return;
  }

  const now = DateTime.now().setZone(config.timezone);
  const runDate = now.startOf('day');

  const run = await prisma.standupRun.findUnique({
    where: {
      guildId_runDate: {
        guildId,
        runDate: runDate.toJSDate(),
      },
    },
    include: {
      responses: {
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          rosterMember: true,
        },
      },
    },
  });

  if (!run || run.status !== 'OPEN') {
    return;
  }

  const client = discordClient.getRawClient();

  for (const response of run.responses) {
    try {
      const user = await client.users.fetch(response.rosterMember.userId);
      const dmChannel = await user.createDM();

      await dmChannel.send({
        content: '⏰ Reminder: Please complete your standup!',
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 1,
                label: 'Continue Standup',
                customId: `standup_continue_${response.rosterMemberId}_${run.id}`,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error(`Failed to send reminder to ${response.rosterMember.userId}:`, error);
    }
  }
}

/**
 * Close the standup run and finalize responses
 */
export async function closeStandup(guildId: string): Promise<void> {
  const config = await prisma.workspaceConfig.findUnique({
    where: { guildId },
  });

  if (!config) {
    throw new Error('Workspace not configured');
  }

  const now = DateTime.now().setZone(config.timezone);
  const runDate = now.startOf('day');

  const run = await prisma.standupRun.findUnique({
    where: {
      guildId_runDate: {
        guildId,
        runDate: runDate.toJSDate(),
      },
    },
    include: {
      responses: true,
    },
  });

  if (!run) {
    throw new Error('No open run found for today');
  }

  if (run.status !== 'OPEN') {
    throw new Error('Run is already closed');
  }

  // Finalize all pending/in-progress responses as MISSING
  await prisma.standupResponse.updateMany({
    where: {
      runId: run.id,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    data: {
      status: 'MISSING',
    },
  });

  // Close the run
  await prisma.standupRun.update({
    where: { id: run.id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  });

  // Enqueue delivery jobs
  await enqueueDeliveries(guildId, run.id);
}
