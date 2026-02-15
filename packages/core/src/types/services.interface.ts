/**
 * Service Interfaces
 *
 * Platform-agnostic service interfaces for the core business logic
 */

import { PlatformAdapter, PlatformMessage, StandupFlowState, DeliveryDestination } from './platform.interface';

/**
 * Standup Service Interface
 * Manages standup state, questions, and flow
 */
export interface IStandupService {
  /**
   * Get the current standup flow state for a user
   */
  getFlowState(userId: string, workspaceId: string): Promise<StandupFlowState | null>;

  /**
   * Start a new standup flow for a user
   */
  startFlow(userId: string, workspaceId: string): Promise<StandupFlowState>;

  /**
   * Continue a standup flow (get next question)
   */
  continueFlow(userId: string, workspaceId: string): Promise<{ state: StandupFlowState; question: any }>;

  /**
   * Submit an answer to the current question
   */
  submitAnswer(userId: string, workspaceId: string, questionId: number, value: string): Promise<StandupFlowState>;

  /**
   * Skip the current question (for optional questions)
   */
  skipQuestion(userId: string, workspaceId: string): Promise<StandupFlowState>;

  /**
   * Complete the standup flow and submit
   */
  completeFlow(userId: string, workspaceId: string): Promise<void>;

  /**
   * Cancel the standup flow
   */
  cancelFlow(userId: string, workspaceId: string): Promise<void>;

  /**
   * Get all standup questions
   */
  getQuestions(): Promise<any[]>;

  /**
   * Get a specific question by ID
   */
  getQuestion(questionId: number): Promise<any>;

  /**
   * Get the next question in the flow
   */
  getNextQuestion(currentQuestionId: number): Promise<any | null>;

  /**
   * Get the previous question in the flow
   */
  getPreviousQuestion(currentQuestionId: number): Promise<any | null>;
}

/**
 * Date Parser Service Interface
 * Parses natural language date expressions
 */
export interface IDateParserService {
  /**
   * Parse a natural language date expression
   */
  parse(expression: string, timezone?: string): Date | null;

  /**
   * Check if a date expression is valid
   */
  isValid(expression: string, timezone?: string): boolean;

  /**
   * Get suggested date options (today, tomorrow, next week, etc.)
   */
  getSuggestions(timezone?: string): Array<{ label: string; value: Date }>;
}

/**
 * Delivery Service Interface
 * Manages delivery of standup reports to various destinations
 */
export interface IDeliveryService {
  /**
   * Enqueue delivery jobs for a completed standup run
   */
  enqueueDeliveries(workspaceId: string, runId: string, destinations: DeliveryDestination[]): Promise<void>;

  /**
   * Process pending delivery jobs
   */
  processPendingJobs(): Promise<void>;

  /**
   * Process a single delivery job
   */
  processJob(jobId: string): Promise<void>;

  /**
   * Retry failed delivery jobs
   */
  retryFailedJobs(runId?: string): Promise<number>;

  /**
   * Get delivery job status
   */
  getJobStatus(jobId: string): Promise<any>;
}

/**
 * Scheduler Service Interface
 * Manages scheduling of standup runs
 */
export interface ISchedulerService {
  /**
   * Start the scheduler
   */
  start(): void;

  /**
   * Stop the scheduler
   */
  stop(): void;

  /**
   * Schedule a standup run for a specific workspace
   */
  scheduleRun(workspaceId: string, runDate: Date): Promise<void>;

  /**
   * Cancel a scheduled standup run
   */
  cancelRun(workspaceId: string, runDate: Date): Promise<void>;

  /**
   * Get scheduled runs for a workspace
   */
  getScheduledRuns(workspaceId: string): Promise<any[]>;

  /**
   * Trigger a manual standup run
   */
  triggerRun(workspaceId: string): Promise<void>;

  /**
   * Close an open standup run
   */
  closeRun(workspaceId: string, runDate: Date): Promise<void>;
}

/**
 * Roster Service Interface
 * Manages the roster of standup participants
 */
export interface IRosterService {
  /**
   * Add a member to the roster
   */
  addMember(workspaceId: string, userId: string, username: string, displayName: string): Promise<void>;

  /**
   * Remove a member from the roster
   */
  removeMember(workspaceId: string, userId: string): Promise<void>;

  /**
   * Update a member's information
   */
  updateMember(workspaceId: string, userId: string, updates: Partial<{ username: string; displayName: string; isActive: boolean }>): Promise<void>;

  /**
   * Get all roster members for a workspace
   */
  getMembers(workspaceId: string): Promise<Array<{ userId: string; username: string; displayName: string; isActive: boolean }>>;

  /**
   * Get active roster members for a workspace
   */
  getActiveMembers(workspaceId: string): Promise<Array<{ userId: string; username: string; displayName: string }>>;

  /**
   * Check if a user is on the roster
   */
  isMember(workspaceId: string, userId: string): Promise<boolean>;

  /**
   * Get a specific roster member
   */
  getMember(workspaceId: string, userId: string): Promise<any>;

  /**
   * Bulk add members to the roster
   */
  bulkAddMembers(workspaceId: string, members: Array<{ userId: string; username: string; displayName: string }>): Promise<void>;
}

/**
 * Excusal Service Interface
 * Manages user excusals from standup
 */
export interface IExcusalService {
  /**
   * Create an excusal for a user
   */
  createExcusal(rosterMemberId: string, startDate: Date, endDate: Date, reason: string): Promise<void>;

  /**
   * Remove an excusal
   */
  removeExcusal(excusalId: string): Promise<void>;

  /**
   * Get active excusals for a user
   */
  getExcusals(rosterMemberId: string): Promise<Array<{ id: string; startDate: Date; endDate: Date; reason: string }>>;

  /**
   * Check if a user is excused on a specific date
   */
  isExcused(rosterMemberId: string, date: Date): Promise<boolean>;

  /**
   * Get all active excusals for a workspace
   */
  getWorkspaceExcusals(workspaceId: string): Promise<Array<any>>;
}

/**
 * Workspace Config Service Interface
 * Manages workspace configuration
 */
export interface IWorkspaceConfigService {
  /**
   * Get workspace configuration
   */
  getConfig(workspaceId: string): Promise<any>;

  /**
   * Update workspace configuration
   */
  updateConfig(workspaceId: string, updates: Partial<{
    managementChannelId: string;
    teamRoleMention: string;
    timezone: string;
    windowOpenTime: string;
    windowCloseTime: string;
    reminderTimes: string[];
    notionParentPageId: string;
    googleSpreadsheetId: string;
    retentionDays: number;
  }>): Promise<void>;

  /**
   * Create workspace configuration
   */
  createConfig(data: {
    workspaceId: string;
    managementChannelId: string;
    teamRoleMention: string;
    timezone?: string;
    windowOpenTime?: string;
    windowCloseTime?: string;
    reminderTimes?: string[];
    retentionDays?: number;
  }): Promise<void>;

  /**
   * Delete workspace configuration
   */
  deleteConfig(workspaceId: string): Promise<void>;
}

/**
 * Audit Service Interface
 * Manages audit trail for admin actions
 */
export interface IAuditService {
  /**
   * Log an audit event
   */
  logEvent(event: {
    workspaceId: string;
    actionType: string;
    actorId: string;
    actorName: string;
    targetId?: string;
    targetType?: string;
    details?: Record<string, unknown>;
  }): Promise<void>;

  /**
   * Get audit events for a workspace
   */
  getEvents(workspaceId: string, filters?: {
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<any>>;

  /**
   * Get audit events for a specific target
   */
  getTargetEvents(targetId: string, targetType: string): Promise<Array<any>>;
}
