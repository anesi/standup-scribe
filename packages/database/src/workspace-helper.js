"use strict";
/**
 * Workspace Helper
 *
 * Helper functions for working with the platform-agnostic workspace schema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findWorkspaceByPlatformId = findWorkspaceByPlatformId;
exports.createWorkspace = createWorkspace;
exports.updateWorkspace = updateWorkspace;
exports.getWorkspacesByPlatform = getWorkspacesByPlatform;
exports.addRosterMember = addRosterMember;
exports.getActiveRosterMembers = getActiveRosterMembers;
exports.isRosterMember = isRosterMember;
exports.createStandupRun = createStandupRun;
exports.getOpenStandupRun = getOpenStandupRun;
exports.closeStandupRun = closeStandupRun;
exports.getOrCreateResponse = getOrCreateResponse;
exports.updateStandupResponse = updateStandupResponse;
exports.logAuditEvent = logAuditEvent;
exports.getAuditEvents = getAuditEvents;
exports.enqueueDeliveryJobs = enqueueDeliveryJobs;
exports.getPendingDeliveryJobs = getPendingDeliveryJobs;
exports.updateDeliveryJob = updateDeliveryJob;
exports.getWorkspaceConfig = getWorkspaceConfig;
const prisma_1 = require("./prisma");
/**
 * Find a workspace config by platform-specific ID
 * This handles both Discord (guildId) and Slack (teamId) lookups
 */
async function findWorkspaceByPlatformId(platformId, platform) {
    // First try to find by workspaceId (new field)
    let workspace = await prisma_1.prisma.workspaceConfig.findUnique({
        where: { workspaceId: platformId },
    });
    // If not found and it's Discord, try the legacy guildId field
    if (!workspace && platform === 'DISCORD') {
        workspace = await prisma_1.prisma.workspaceConfig.findUnique({
            where: { guildId: platformId },
        });
        // If found via guildId, migrate it to use workspaceId
        if (workspace && !workspace.workspaceId) {
            workspace = await prisma_1.prisma.workspaceConfig.update({
                where: { id: workspace.id },
                data: { workspaceId: platformId },
            });
        }
    }
    // Verify the platform type matches
    if (workspace && workspace.platformType !== platform) {
        throw new Error(`Workspace ${platformId} is registered as ${workspace.platformType}, not ${platform}`);
    }
    return workspace;
}
/**
 * Create a new workspace config
 */
async function createWorkspace(data) {
    return prisma_1.prisma.workspaceConfig.create({
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
async function updateWorkspace(workspaceId, updates) {
    return prisma_1.prisma.workspaceConfig.update({
        where: { workspaceId },
        data: updates,
    });
}
/**
 * Get all workspaces for a specific platform
 */
async function getWorkspacesByPlatform(platform) {
    return prisma_1.prisma.workspaceConfig.findMany({
        where: { platformType: platform },
    });
}
/**
 * Add a roster member to a workspace
 */
async function addRosterMember(data) {
    return prisma_1.prisma.rosterMember.create({
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
async function getActiveRosterMembers(workspaceId) {
    return prisma_1.prisma.rosterMember.findMany({
        where: {
            workspaceId,
            isActive: true,
        },
    });
}
/**
 * Check if a user is on the roster
 */
async function isRosterMember(workspaceId, userId) {
    const member = await prisma_1.prisma.rosterMember.findUnique({
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
async function createStandupRun(workspaceId, runDate) {
    return prisma_1.prisma.standupRun.upsert({
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
async function getOpenStandupRun(workspaceId) {
    return prisma_1.prisma.standupRun.findFirst({
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
async function closeStandupRun(runId) {
    return prisma_1.prisma.standupRun.update({
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
async function getOrCreateResponse(runId, rosterMemberId) {
    return prisma_1.prisma.standupResponse.upsert({
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
async function updateStandupResponse(responseId, updates) {
    return prisma_1.prisma.standupResponse.update({
        where: { id: responseId },
        data: updates,
    });
}
/**
 * Log an audit event
 */
async function logAuditEvent(data) {
    return prisma_1.prisma.auditEvent.create({
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
async function getAuditEvents(workspaceId, options) {
    const where = { workspaceId };
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
    return prisma_1.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
    });
}
/**
 * Enqueue delivery jobs for a completed run
 */
async function enqueueDeliveryJobs(runId, destinations) {
    const jobs = await prisma_1.prisma.deliveryJob.createMany({
        data: destinations.map((destination) => ({
            runId,
            destination: destination,
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
async function getPendingDeliveryJobs(limit = 10) {
    return prisma_1.prisma.deliveryJob.findMany({
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
async function updateDeliveryJob(jobId, updates) {
    return prisma_1.prisma.deliveryJob.update({
        where: { id: jobId },
        data: updates,
    });
}
/**
 * Get workspace config with all related data
 */
async function getWorkspaceConfig(workspaceId) {
    return prisma_1.prisma.workspaceConfig.findUnique({
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
//# sourceMappingURL=workspace-helper.js.map