/**
 * Workspace Helper
 *
 * Helper functions for working with the platform-agnostic workspace schema
 */
import { PlatformType, AuditAction } from '@prisma/client';
import type { Prisma } from '@prisma/client';
/**
 * Find a workspace config by platform-specific ID
 * This handles both Discord (guildId) and Slack (teamId) lookups
 */
export declare function findWorkspaceByPlatformId(platformId: string, platform: PlatformType): Promise<{
    id: string;
    workspaceId: string;
    guildId: string | null;
    platformType: import("@prisma/client").$Enums.PlatformType;
    managementChannelId: string;
    teamRoleMention: string;
    timezone: string;
    windowOpenTime: string;
    windowCloseTime: string;
    reminderTimes: string[];
    notionParentPageId: string | null;
    googleSpreadsheetId: string | null;
    retentionDays: number;
    platformMetadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
} | null>;
/**
 * Create a new workspace config
 */
export declare function createWorkspace(data: {
    workspaceId: string;
    platformType: PlatformType;
    managementChannelId: string;
    teamRoleMention: string;
    timezone?: string;
    windowOpenTime?: string;
    windowCloseTime?: string;
    reminderTimes?: string[];
    retentionDays?: number;
    guildId?: string;
}): Promise<{
    id: string;
    workspaceId: string;
    guildId: string | null;
    platformType: import("@prisma/client").$Enums.PlatformType;
    managementChannelId: string;
    teamRoleMention: string;
    timezone: string;
    windowOpenTime: string;
    windowCloseTime: string;
    reminderTimes: string[];
    notionParentPageId: string | null;
    googleSpreadsheetId: string | null;
    retentionDays: number;
    platformMetadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Update workspace configuration
 */
export declare function updateWorkspace(workspaceId: string, updates: Partial<{
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
}>): Promise<{
    id: string;
    workspaceId: string;
    guildId: string | null;
    platformType: import("@prisma/client").$Enums.PlatformType;
    managementChannelId: string;
    teamRoleMention: string;
    timezone: string;
    windowOpenTime: string;
    windowCloseTime: string;
    reminderTimes: string[];
    notionParentPageId: string | null;
    googleSpreadsheetId: string | null;
    retentionDays: number;
    platformMetadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
}>;
/**
 * Get all workspaces for a specific platform
 */
export declare function getWorkspacesByPlatform(platform: PlatformType): Promise<{
    id: string;
    workspaceId: string;
    guildId: string | null;
    platformType: import("@prisma/client").$Enums.PlatformType;
    managementChannelId: string;
    teamRoleMention: string;
    timezone: string;
    windowOpenTime: string;
    windowCloseTime: string;
    reminderTimes: string[];
    notionParentPageId: string | null;
    googleSpreadsheetId: string | null;
    retentionDays: number;
    platformMetadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
}[]>;
/**
 * Add a roster member to a workspace
 */
export declare function addRosterMember(data: {
    workspaceId: string;
    userId: string;
    username: string;
    displayName: string;
}): Promise<{
    id: string;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    username: string;
    displayName: string;
    isActive: boolean;
}>;
/**
 * Get active roster members for a workspace
 */
export declare function getActiveRosterMembers(workspaceId: string): Promise<{
    id: string;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    username: string;
    displayName: string;
    isActive: boolean;
}[]>;
/**
 * Check if a user is on the roster
 */
export declare function isRosterMember(workspaceId: string, userId: string): Promise<boolean>;
/**
 * Create or find a standup run
 */
export declare function createStandupRun(workspaceId: string, runDate: Date): Promise<{
    id: string;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
    runDate: Date;
    status: import("@prisma/client").$Enums.RunStatus;
    closedAt: Date | null;
}>;
/**
 * Get the current open standup run for a workspace
 */
export declare function getOpenStandupRun(workspaceId: string): Promise<({
    responses: ({
        rosterMember: {
            id: string;
            workspaceId: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            username: string;
            displayName: string;
            isActive: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ResponseStatus;
        runId: string;
        rosterMemberId: string;
        answers: Prisma.JsonValue;
        submittedAt: Date | null;
        dmError: string | null;
    })[];
} & {
    id: string;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
    runDate: Date;
    status: import("@prisma/client").$Enums.RunStatus;
    closedAt: Date | null;
}) | null>;
/**
 * Close a standup run
 */
export declare function closeStandupRun(runId: string): Promise<{
    id: string;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
    runDate: Date;
    status: import("@prisma/client").$Enums.RunStatus;
    closedAt: Date | null;
}>;
/**
 * Get or create a standup response for a user
 */
export declare function getOrCreateResponse(runId: string, rosterMemberId: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import("@prisma/client").$Enums.ResponseStatus;
    runId: string;
    rosterMemberId: string;
    answers: Prisma.JsonValue;
    submittedAt: Date | null;
    dmError: string | null;
}>;
/**
 * Update a standup response
 */
export declare function updateStandupResponse(responseId: string, updates: {
    status?: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXCUSED' | 'DM_FAILED' | 'MISSING';
    answers?: Prisma.InputJsonValue;
    submittedAt?: Date;
    dmError?: string;
}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import("@prisma/client").$Enums.ResponseStatus;
    runId: string;
    rosterMemberId: string;
    answers: Prisma.JsonValue;
    submittedAt: Date | null;
    dmError: string | null;
}>;
/**
 * Log an audit event
 */
export declare function logAuditEvent(data: {
    workspaceId: string;
    actionType: AuditAction;
    actorId: string;
    actorName: string;
    targetId?: string;
    targetType?: string;
    details?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
}): Promise<{
    id: string;
    workspaceId: string;
    createdAt: Date;
    actionType: import("@prisma/client").$Enums.AuditAction;
    actorId: string;
    actorName: string;
    targetId: string | null;
    targetType: string | null;
    details: Prisma.JsonValue | null;
    ipAddress: string | null;
    userAgent: string | null;
}>;
/**
 * Get audit events for a workspace
 */
export declare function getAuditEvents(workspaceId: string, options?: {
    actionType?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}): Promise<{
    id: string;
    workspaceId: string;
    createdAt: Date;
    actionType: import("@prisma/client").$Enums.AuditAction;
    actorId: string;
    actorName: string;
    targetId: string | null;
    targetType: string | null;
    details: Prisma.JsonValue | null;
    ipAddress: string | null;
    userAgent: string | null;
}[]>;
/**
 * Enqueue delivery jobs for a completed run
 */
export declare function enqueueDeliveryJobs(runId: string, destinations: string[]): Promise<Prisma.BatchPayload>;
/**
 * Get pending delivery jobs
 */
export declare function getPendingDeliveryJobs(limit?: number): Promise<({
    run: {
        workspace: {
            id: string;
            workspaceId: string;
            guildId: string | null;
            platformType: import("@prisma/client").$Enums.PlatformType;
            managementChannelId: string;
            teamRoleMention: string;
            timezone: string;
            windowOpenTime: string;
            windowCloseTime: string;
            reminderTimes: string[];
            notionParentPageId: string | null;
            googleSpreadsheetId: string | null;
            retentionDays: number;
            platformMetadata: Prisma.JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        };
        responses: ({
            rosterMember: {
                id: string;
                workspaceId: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                username: string;
                displayName: string;
                isActive: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ResponseStatus;
            runId: string;
            rosterMemberId: string;
            answers: Prisma.JsonValue;
            submittedAt: Date | null;
            dmError: string | null;
        })[];
    } & {
        id: string;
        workspaceId: string;
        createdAt: Date;
        updatedAt: Date;
        runDate: Date;
        status: import("@prisma/client").$Enums.RunStatus;
        closedAt: Date | null;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import("@prisma/client").$Enums.DeliveryStatus;
    runId: string;
    destination: import("@prisma/client").$Enums.Destination;
    attemptCount: number;
    nextAttemptAt: Date | null;
    lastError: string | null;
    completedAt: Date | null;
})[]>;
/**
 * Update delivery job status
 */
export declare function updateDeliveryJob(jobId: string, updates: {
    status: 'PENDING' | 'RETRYING' | 'SUCCESS' | 'FAILED';
    attemptCount?: number;
    nextAttemptAt?: Date;
    lastError?: string;
    completedAt?: Date;
}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import("@prisma/client").$Enums.DeliveryStatus;
    runId: string;
    destination: import("@prisma/client").$Enums.Destination;
    attemptCount: number;
    nextAttemptAt: Date | null;
    lastError: string | null;
    completedAt: Date | null;
}>;
/**
 * Get workspace config with all related data
 */
export declare function getWorkspaceConfig(workspaceId: string): Promise<({
    rosterMembers: {
        id: string;
        workspaceId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string;
        displayName: string;
        isActive: boolean;
    }[];
    standupRuns: {
        id: string;
        workspaceId: string;
        createdAt: Date;
        updatedAt: Date;
        runDate: Date;
        status: import("@prisma/client").$Enums.RunStatus;
        closedAt: Date | null;
    }[];
    auditEvents: {
        id: string;
        workspaceId: string;
        createdAt: Date;
        actionType: import("@prisma/client").$Enums.AuditAction;
        actorId: string;
        actorName: string;
        targetId: string | null;
        targetType: string | null;
        details: Prisma.JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
    }[];
} & {
    id: string;
    workspaceId: string;
    guildId: string | null;
    platformType: import("@prisma/client").$Enums.PlatformType;
    managementChannelId: string;
    teamRoleMention: string;
    timezone: string;
    windowOpenTime: string;
    windowCloseTime: string;
    reminderTimes: string[];
    notionParentPageId: string | null;
    googleSpreadsheetId: string | null;
    retentionDays: number;
    platformMetadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
}) | null>;
//# sourceMappingURL=workspace-helper.d.ts.map