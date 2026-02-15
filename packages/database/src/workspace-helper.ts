/**
 * Workspace Helper
 *
 * Helper functions for working with the platform-agnostic workspace schema
 */

import { prisma } from './prisma';
import { PlatformType, AuditAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/**
 * Find a workspace config by platform-specific ID
 * This handles both Discord (guildId) and Slack (teamId) lookups
 */
export async function findWorkspaceByPlatformId(
  platformId: string,
  platform: PlatformType,
) {
  // First try to find by workspaceId (new field)
  let workspace = await prisma.workspaceConfig.findUnique({
    where: { workspaceId: platformId },
  });

  // If not found and it's Discord, try the legacy guildId field
  if (!workspace && platform === 'DISCORD') {
    workspace = await prisma.workspaceConfig.findUnique({
      where: { guildId: platformId },
    });

    // If found via guildId, migrate it to use workspaceId
    if (workspace && !workspace.workspaceId) {
      workspace = await prisma.workspaceConfig.update({
        where: { id: workspace.id },
        data: { workspaceId: platformId },
      });
    }
  }

  // Verify the platform type matches
  if (workspace && workspace.platformType !== platform) {
    throw new Error(
      `Workspace ${platformId} is registered as ${workspace.platformType}, not ${platform}`,
    );
  }

  return workspace;
}

/**
 * Create a new workspace config
 */
export async function createWorkspace(data: {
  workspaceId: string;
  platformType: PlatformType;
  managementChannelId: string;
  teamRoleMention: string;
  timezone?: string;
  windowOpenTime?: string;
  windowCloseTime?: string;
  reminderTimes?: string[];
  retentionDays?: number;
  guildId?: string; // Optional legacy field for Discord
}) {
  return prisma.workspaceConfig.create({
    data: {
      workspaceId: data.workspaceId,
      platformType: data.platformType,
      managementChannelId: data.managementChannelId,
      teamRoleMention: data.teamRoleMention,
      timezone: data.timezone || 'Africa/Lagos',
      windowOpenTime: data.windowOpenTime || '09:00',
      windowCloseTime: data.windowCloseTime || '16:00',
      reminderTimes: data.reminderTimes || ['10:00', '12:00', '14:00'],
      retentionDays: data.retentionDays || 1825,
      guildId: data.guildId,
    },
  });
}

/**
 * Update workspace configuration
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<{
    managementChannelId: string;
    teamRoleMention: string;
    timezone: string;
    windowOpenTime: string;
    windowCloseTime: string;
    reminderTimes: string[];
    notionParentPageId: string;
    googleSpreadsheetId: string;
    retentionDays: number;
    platformMetadata: Prisma.InputJsonValue;
  }>,
) {
  return prisma.workspaceConfig.update({
    where: { workspaceId },
    data: updates as Prisma.WorkspaceConfigUpdateInput,
  });
}

/**
 * Get all workspaces for a specific platform
 */
export async function getWorkspacesByPlatform(platform: PlatformType) {
  return prisma.workspaceConfig.findMany({
    where: { platformType: platform },
  });
}

/**
 * Add a roster member to a workspace
 */
export async function addRosterMember(data: {
  workspaceId: string;
  userId: string;
  username: string;
  displayName: string;
}) {
  return prisma.rosterMember.create({
    data: {
      workspaceId: data.workspaceId,
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
      isActive: true,
    },
  });
}

/**
 * Get active roster members for a workspace
 */
export async function getActiveRosterMembers(workspaceId: string) {
  return prisma.rosterMember.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
  });
}

/**
 * Check if a user is on the roster
 */
export async function isRosterMember(workspaceId: string, userId: string) {
  const member = await prisma.rosterMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });
  return member !== null && member.isActive;
}

/**
 * Create or find a standup run
 */
export async function createStandupRun(workspaceId: string, runDate: Date) {
  return prisma.standupRun.upsert({
    where: {
      workspaceId_runDate: {
        workspaceId,
        runDate,
      },
    },
    create: {
      workspaceId,
      runDate,
      status: 'OPEN',
    },
    update: {}, // Don't update if it exists
  });
}

/**
 * Get the current open standup run for a workspace
 */
export async function getOpenStandupRun(workspaceId: string) {
  return prisma.standupRun.findFirst({
    where: {
      workspaceId,
      status: 'OPEN',
    },
    include: {
      responses: {
        include: {
          rosterMember: true,
        },
      },
    },
  });
}

/**
 * Close a standup run
 */
export async function closeStandupRun(runId: string) {
  return prisma.standupRun.update({
    where: { id: runId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  });
}

/**
 * Get or create a standup response for a user
 */
export async function getOrCreateResponse(runId: string, rosterMemberId: string) {
  return prisma.standupResponse.upsert({
    where: {
      runId_rosterMemberId: {
        runId,
        rosterMemberId,
      },
    },
    create: {
      runId,
      rosterMemberId,
      status: 'PENDING',
      answers: {},
    },
    update: {}, // Don't update if it exists
  });
}

/**
 * Update a standup response
 */
export async function updateStandupResponse(
  responseId: string,
  updates: {
    status?: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXCUSED' | 'DM_FAILED' | 'MISSING';
    answers?: Prisma.InputJsonValue;
    submittedAt?: Date;
    dmError?: string;
  },
) {
  return prisma.standupResponse.update({
    where: { id: responseId },
    data: updates as Prisma.StandupResponseUpdateInput,
  });
}

/**
 * Log an audit event
 */
export async function logAuditEvent(data: {
  workspaceId: string;
  actionType: AuditAction;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetType?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditEvent.create({
    data: {
      workspaceId: data.workspaceId,
      actionType: data.actionType,
      actorId: data.actorId,
      actorName: data.actorName,
      targetId: data.targetId,
      targetType: data.targetType,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}

/**
 * Get audit events for a workspace
 */
export async function getAuditEvents(
  workspaceId: string,
  options?: {
    actionType?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  },
) {
  const where: Prisma.AuditEventWhereInput = { workspaceId };

  if (options?.actionType) {
    where.actionType = options.actionType;
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  return prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  });
}

/**
 * Enqueue delivery jobs for a completed run
 */
export async function enqueueDeliveryJobs(
  runId: string,
  destinations: string[],
) {
  const jobs = await prisma.deliveryJob.createMany({
    data: destinations.map((destination) => ({
      runId,
      destination: destination as any,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: new Date(),
    })),
  });

  return jobs;
}

/**
 * Get pending delivery jobs
 */
export async function getPendingDeliveryJobs(limit = 10) {
  return prisma.deliveryJob.findMany({
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
    take: limit,
  });
}

/**
 * Update delivery job status
 */
export async function updateDeliveryJob(
  jobId: string,
  updates: {
    status: 'PENDING' | 'RETRYING' | 'SUCCESS' | 'FAILED';
    attemptCount?: number;
    nextAttemptAt?: Date;
    lastError?: string;
    completedAt?: Date;
  },
) {
  return prisma.deliveryJob.update({
    where: { id: jobId },
    data: updates,
  });
}

/**
 * Get workspace config with all related data
 */
export async function getWorkspaceConfig(workspaceId: string) {
  return prisma.workspaceConfig.findUnique({
    where: { workspaceId },
    include: {
      rosterMembers: {
        where: { isActive: true },
      },
      standupRuns: {
        orderBy: { runDate: 'desc' },
        take: 10,
      },
      auditEvents: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
}
