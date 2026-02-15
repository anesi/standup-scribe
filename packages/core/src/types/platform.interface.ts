/**
 * Platform-Agnostic Type Definitions
 *
 * This module defines the interfaces and types that allow Standup Scribe
 * to work across multiple platforms (Discord, Slack, etc.)
 */

/**
 * Supported platform types
 */
export type PlatformType = 'discord' | 'slack';

/**
 * Platform-agnostic user representation
 */
export interface PlatformUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

/**
 * Platform-agnostic workspace/server representation
 */
export interface PlatformWorkspace {
  id: string;
  name: string;
  iconUrl?: string;
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

/**
 * Platform-agnostic channel representation
 */
export interface PlatformChannel {
  id: string;
  name: string;
  type: 'text' | 'dm' | 'group';
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

/**
 * Platform-agnostic message content
 */
export interface PlatformMessage {
  content: string;
  embeds?: PlatformEmbed[];
  components?: PlatformComponent[];
  ephemeral?: boolean;
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

/**
 * Platform-agnostic embed (rich content)
 * Discord uses embeds, Slack uses blocks
 */
export interface PlatformEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: PlatformEmbedField[];
  footer?: PlatformEmbedFooter;
  timestamp?: Date;
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

export interface PlatformEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface PlatformEmbedFooter {
  text: string;
  iconUrl?: string;
}

/**
 * Platform-agnostic UI component (button, select, etc.)
 */
export interface PlatformComponent {
  type: 'button' | 'select' | 'action_row';
  components?: PlatformComponent[];
  // Button/Select specific
  label?: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger' | 'link';
  customId?: string;
  url?: string;
  disabled?: boolean;
  // Select specific
  placeholder?: string;
  options?: PlatformSelectOption[];
  minValues?: number;
  maxValues?: number;
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

export interface PlatformSelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

/**
 * Platform-agnostic modal/form
 */
export interface PlatformModal {
  title: string;
  customId: string;
  components: PlatformModalComponent[];
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

export interface PlatformModalComponent {
  type: 'text_input' | 'paragraph';
  label: string;
  customId: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  style?: 'short' | 'paragraph';
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

/**
 * Platform-agnostic interaction/event
 */
export interface PlatformInteraction {
  id: string;
  type: 'command' | 'button' | 'modal' | 'select';
  userId: string;
  channelId: string;
  workspaceId: string;
  customId?: string;
  values?: Record<string, string>;
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
  // Response methods
  reply: (message: PlatformMessage) => Promise<void>;
  deferReply: () => Promise<void>;
  update: (message: PlatformMessage) => Promise<void>;
  deferUpdate: () => Promise<void>;
  showModal: (modal: PlatformModal) => Promise<void>;
}

/**
 * Platform-agnostic command definition
 */
export interface PlatformCommand {
  name: string;
  description: string;
  options: PlatformCommandOption[];
  handler: (interaction: PlatformInteraction) => Promise<void>;
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

export interface PlatformCommandOption {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'integer' | 'user' | 'channel' | 'role';
  required?: boolean;
  choices?: PlatformCommandOptionChoice[];
  // Platform-specific metadata
  metadata?: Record<string, unknown>;
}

export interface PlatformCommandOptionChoice {
  name: string;
  value: string | number;
}

/**
 * Main Platform Adapter Interface
 *
 * This interface defines the contract that all platform adapters must implement.
 * It provides a unified API for platform-agnostic business logic to interact
 * with different chat platforms.
 */
export interface PlatformAdapter {
  /** Platform identifier */
  readonly platformType: PlatformType;

  /**
   * Initialize the platform client with authentication
   * @param token - Platform-specific authentication token
   */
  initialize(token: string): Promise<void>;

  /**
   * Start the platform client and connect to the platform
   */
  start(): Promise<void>;

  /**
   * Stop the platform client and disconnect gracefully
   */
  stop(): Promise<void>;

  /**
   * Fetch user information from the platform
   * @param userId - Platform-specific user ID
   */
  fetchUser(userId: string): Promise<PlatformUser>;

  /**
   * Fetch workspace/server information from the platform
   * @param workspaceId - Platform-specific workspace ID
   */
  fetchWorkspace(workspaceId: string): Promise<PlatformWorkspace>;

  /**
   * Send a direct message to a user
   * @param userId - Platform-specific user ID
   * @param message - Message to send
   */
  sendDirectMessage(userId: string, message: PlatformMessage): Promise<void>;

  /**
   * Send a message to a channel
   * @param channelId - Platform-specific channel ID
   * @param message - Message to send
   */
  sendChannelMessage(channelId: string, message: PlatformMessage): Promise<void>;

  /**
   * Reply to an interaction
   * @param interaction - The interaction to reply to
   * @param message - Message to send
   */
  replyToInteraction(interaction: PlatformInteraction, message: PlatformMessage): Promise<void>;

  /**
   * Show a modal/dialog to the user
   * @param interaction - The interaction that triggered the modal
   * @param modal - Modal to display
   */
  showModal(interaction: PlatformInteraction, modal: PlatformModal): Promise<void>;

  /**
   * Register slash commands with the platform
   * @param commands - Commands to register
   * @param workspaceId - Optional workspace ID for guild commands
   */
  registerCommands(commands: PlatformCommand[], workspaceId?: string): Promise<void>;

  /**
   * Register a handler for button interactions
   * @param handler - Function to handle button interactions
   */
  onButton(handler: (interaction: PlatformInteraction) => void | Promise<void>): void;

  /**
   * Register a handler for modal submissions
   * @param handler - Function to handle modal submissions
   */
  onModal(handler: (interaction: PlatformInteraction) => void | Promise<void>): void;

  /**
   * Register a handler for slash commands
   * @param handler - Function to handle slash commands
   */
  onCommand(handler: (interaction: PlatformInteraction) => void | Promise<void>): void;

  /**
   * Check if a user has a specific permission
   * @param interaction - The interaction to check permissions for
   * @param permission - Permission to check (platform-specific)
   */
  hasPermission(interaction: PlatformInteraction, permission: string): Promise<boolean>;

  /**
   * Get the raw platform client (for platform-specific operations)
   */
  getRawClient(): unknown;
}

/**
 * Standup Flow State
 * Platform-agnostic representation of standup flow state
 */
export interface StandupFlowState {
  userId: string;
  workspaceId: string;
  currentQuestion: number;
  answers: Record<number, string>;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Standup Questions Definition
 * The 13 questions asked in the standup flow
 */
export interface StandupQuestion {
  id: number;
  key: string;
  text: string;
  type: 'text' | 'select' | 'date' | 'boolean';
  required: boolean;
  options?: string[]; // For select questions
  placeholder?: string;
  maxLength?: number;
}

/**
 * Standup Answer
 * Platform-agnostic representation of a standup answer
 */
export interface StandupAnswer {
  questionId: number;
  value: string;
  timestamp: Date;
}

/**
 * Delivery Destination
 * Where to deliver the standup report
 */
export type DeliveryDestination = 'discord' | 'slack' | 'notion' | 'sheets' | 'csv';

/**
 * Standup Report
 * Platform-agnostic representation of a completed standup report
 */
export interface StandupReport {
  workspaceId: string;
  runDate: Date;
  responses: StandupResponseReport[];
  metadata: Record<string, unknown>;
}

export interface StandupResponseReport {
  userId: string;
  username: string;
  displayName: string;
  answers: StandupAnswer[];
  submittedAt: Date;
  status: 'submitted' | 'excused' | 'missing' | 'dm_failed';
}
