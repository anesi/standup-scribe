/**
 * Slack Platform Adapter
 *
 * Implements the PlatformAdapter interface for Slack
 */

import {
  PlatformAdapter,
  PlatformType,
  PlatformUser,
  PlatformWorkspace,
  PlatformMessage,
  PlatformModal,
  PlatformInteraction,
  PlatformCommand,
} from '@standup-scribe/core';
import { WebClient } from '@slack/web-api';
import { App, ExpressReceiver } from '@slack/bolt';

/**
 * Slack-specific interaction wrapper
 */
class SlackPlatformInteraction implements PlatformInteraction {
  constructor(
    private payload: any,
    private context: { app: App; respond: (response: any) => Promise<void> },
  ) {}

  get id(): string {
    return this.payload.action_ts || this.payload.trigger_id || this.payload.container.message_ts || Date.now().toString();
  }

  get type(): 'command' | 'button' | 'modal' | 'select' {
    if (this.payload.type === 'command') return 'command';
    if (this.payload.type === 'block_actions' || this.payload.actions) return 'button';
    if (this.payload.type === 'view_submission' || this.payload.type === 'view_closed') return 'modal';
    if (this.payload.type === 'block_suggestions') return 'select';
    return 'command';
  }

  get userId(): string {
    return this.payload.user_id || this.payload.user?.id || '';
  }

  get channelId(): string {
    return this.payload.channel_id || this.payload.channel?.id || '';
  }

  get workspaceId(): string {
    return this.payload.team_id || this.payload.team?.id || '';
  }

  get customId(): string | undefined {
    if (this.payload.actions && this.payload.actions[0]) {
      return this.payload.actions[0].action_id;
    }
    if (this.payload.view) {
      return this.payload.view.callback_id;
    }
    return undefined;
  }

  get values(): Record<string, string> | undefined {
    if (this.payload.view?.state?.values) {
      const values: Record<string, string> = {};
      for (const [blockId, blockData] of Object.entries(this.payload.view.state.values)) {
        for (const [actionId, actionData] of Object.entries(blockData as any)) {
          if (actionData.type === 'plain_text_input') {
            values[actionId] = actionData.value;
          }
        }
      }
      return values;
    }
    return undefined;
  }

  get metadata(): Record<string, unknown> {
    return {
      apiAppId: this.payload.api_app_id,
      token: this.payload.token?.substring(0, 10) + '...',
    };
  }

  async reply(message: PlatformMessage): Promise<void> {
    const slackMessage = this.toSlackMessage(message);
    if (this.payload.response_url) {
      // For button interactions, use response_url
      const client = new WebClient(this.context.context.botToken);
      await client.chat.postMessage({
        channel: this.channelId,
        ...slackMessage,
      });
    } else if (this.type === 'command') {
      // For slash commands, use the respond function
      await this.context.respond({
        text: slackMessage.text || '',
        blocks: slackMessage.blocks,
        response_type: message.ephemeral ? 'ephemeral' : 'in_channel',
      });
    } else {
      // Fallback
      const client = new WebClient(this.context.context.botToken);
      await client.chat.postMessage({
        channel: this.channelId,
        ...slackMessage,
      });
    }
  }

  async deferReply(): Promise<void> {
    // Slack doesn't have a true defer mechanism, so we send an empty ephemeral message
    if (this.type === 'command' && this.context.respond) {
      await this.context.respond({
        text: '...',
        response_type: 'ephemeral',
      });
    }
  }

  async update(message: PlatformMessage): Promise<void> {
    if (this.payload.response_url) {
      const client = new WebClient(this.context.context.botToken);
      await client.chat.update({
        channel: this.channelId,
        ts: this.payload.container.message_ts,
        ...this.toSlackMessage(message),
      });
    }
  }

  async deferUpdate(): Promise<void> {
    // Slack doesn't require deferUpdate like Discord
    // This is a no-op
  }

  async showModal(modal: PlatformModal): Promise<void> {
    const client = new WebClient(this.context.context.botToken);
    await client.views.open({
      trigger_id: this.payload.trigger_id,
      view: this.toSlackModal(modal),
    });
  }

  private toSlackMessage(message: PlatformMessage): any {
    const slackMessage: any = {};

    if (message.content) {
      slackMessage.text = message.content;
    }

    if (message.embeds && message.embeds.length > 0) {
      // Convert embeds to Slack blocks
      const blocks: any[] = [];

      for (const embed of message.embeds) {
        if (embed.title) {
          blocks.push({
            type: 'header',
            text: {
              type: 'plain_text',
              text: embed.title,
              emoji: true,
            },
          });
        }

        if (embed.description) {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: embed.description,
            },
          });
        }

        if (embed.fields && embed.fields.length > 0) {
          // Group fields into pairs for Slack's section layout
          for (let i = 0; i < embed.fields.length; i += 2) {
            const fields = [
              {
                type: 'mrkdwn',
                text: `*${embed.fields[i].name}*\n${embed.fields[i].value}`,
              },
            ];

            if (i + 1 < embed.fields.length) {
              fields.push({
                type: 'mrkdwn',
                text: `*${embed.fields[i + 1].name}*\n${embed.fields[i + 1].value}`,
              });
            }

            blocks.push({
              type: 'section',
              fields,
            });
          }
        }

        if (embed.footer) {
          blocks.push({
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: embed.footer.text,
              },
            ],
          });
        }
      }

      slackMessage.blocks = blocks;
    }

    if (message.components && message.components.length > 0) {
      const blocks = slackMessage.blocks || [];

      for (const component of message.components) {
        if (component.components) {
          const elements = component.components.map(comp => {
            if (comp.type === 'button') {
              return {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: comp.label || '',
                  emoji: true,
                },
                action_id: comp.customId || '',
                style: comp.style === 'danger' ? 'danger' : comp.style === 'success' ? 'primary' : 'default',
              };
            }
            return null;
          }).filter(Boolean);

          blocks.push({
            type: 'actions',
            elements,
          });
        }
      }

      slackMessage.blocks = blocks;
    }

    return slackMessage;
  }

  private toSlackModal(modal: PlatformModal): any {
    const blocks: any[] = [];

    for (const comp of modal.components) {
      const block: any = {
        type: 'input',
        block_id: comp.customId,
        label: {
          type: 'plain_text',
          text: comp.label,
          emoji: true,
        },
        element: {
          type: 'plain_text_input',
          action_id: comp.customId,
          placeholder: {
            type: 'plain_text',
            text: comp.placeholder || '',
            emoji: true,
          },
        },
      };

      if (comp.maxLength) {
        block.element.max_length = comp.maxLength;
      }

      if (comp.minLength) {
        block.element.min_length = comp.minLength;
      }

      if (comp.style === 'paragraph') {
        block.element.multiline = true;
      }

      blocks.push(block);
    }

    return {
      type: 'modal',
      title: {
        type: 'plain_text',
        text: modal.title,
        emoji: true,
      },
      blocks,
      close: {
        type: 'plain_text',
        text: 'Cancel',
        emoji: true,
      },
      submit: {
        type: 'plain_text',
        text: 'Submit',
        emoji: true,
      },
      private_metadata: modal.customId,
    };
  }
}

/**
 * Slack Platform Adapter Implementation
 */
export class SlackAdapter implements PlatformAdapter {
  readonly platformType: PlatformType = 'slack';

  private app: App;
  private webClient: WebClient;
  private commands: Map<string, PlatformCommand>;
  private buttonHandlers: Array<(interaction: PlatformInteraction) => void | Promise<void>>;
  private modalHandlers: Array<(interaction: PlatformInteraction) => void | Promise<void>>;
  private commandHandlers: Array<(interaction: PlatformInteraction) => void | Promise<void>>;
  private isInitialized = false;

  constructor(config?: { signingSecret?: string; token?: string }) {
    this.commands = new Map();
    this.buttonHandlers = [];
    this.modalHandlers = [];
    this.commandHandlers = [];

    // Initialize Slack Bolt app
    this.app = new App({
      signingSecret: config?.signingSecret || process.env.SLACK_SIGNING_SECRET,
      token: config?.token || process.env.SLACK_BOT_TOKEN,
    });

    this.webClient = new WebClient(config?.token || process.env.SLACK_BOT_TOKEN);

    this.setupEventHandlers();
  }

  async initialize(token: string): Promise<void> {
    this.webClient = new WebClient(token);
    // Reinitialize app with new token
    this.app = new App({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token,
    });
    this.setupEventHandlers();
    this.isInitialized = true;
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize(process.env.SLACK_BOT_TOKEN || '');
    }

    const port = parseInt(process.env.SLACK_PORT || '3000', 10);
    await this.app.start(port);
    console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
  }

  async stop(): Promise<void> {
    await this.app.stop();
  }

  async fetchUser(userId: string): Promise<PlatformUser> {
    const result = await this.webClient.users.info({ user: userId });
    if (!result.user) {
      throw new Error(`User ${userId} not found`);
    }

    return {
      id: result.user.id,
      username: result.user.name,
      displayName: result.user.profile?.display_name || result.user.profile?.real_name,
      avatarUrl: result.user.profile?.image_192,
      metadata: {
        isBot: result.user.is_bot,
        deleted: result.user.deleted,
      },
    };
  }

  async fetchWorkspace(workspaceId: string): Promise<PlatformWorkspace> {
    const result = await this.webClient.team.info({ teamId: workspaceId });
    if (!result.team) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    return {
      id: result.team.id || workspaceId,
      name: result.team.name || '',
      iconUrl: result.team.icon?.image_132,
      metadata: {
        domain: result.team.domain,
        enterpriseId: result.team.enterprise_id,
        enterpriseName: result.team.enterprise_name,
      },
    };
  }

  async sendDirectMessage(userId: string, message: PlatformMessage): Promise<void> {
    // Open a DM channel with the user
    const imResult = await this.webClient.conversations.open({
      users: userId,
    });

    if (!imResult.channel?.id) {
      throw new Error(`Failed to open DM channel with user ${userId}`);
    }

    await this.sendChannelMessage(imResult.channel.id, message);
  }

  async sendChannelMessage(channelId: string, message: PlatformMessage): Promise<void> {
    const slackMessage = this.toSlackMessage(message);
    await this.webClient.chat.postMessage({
      channel: channelId,
      ...slackMessage,
    });
  }

  async replyToInteraction(interaction: PlatformInteraction, message: PlatformMessage): Promise<void> {
    await interaction.reply(message);
  }

  async showModal(interaction: PlatformInteraction, modal: PlatformModal): Promise<void> {
    await interaction.showModal(modal);
  }

  async registerCommands(commands: PlatformCommand[], workspaceId?: string): Promise<void> {
    // Store commands for later use
    for (const command of commands) {
      this.commands.set(command.name, command);
    }

    // Register commands with Slack
    for (const command of commands) {
      this.app.command(command.name, async ({ command, ack, respond, context }) => {
        await ack();

        const platformInteraction = new SlackPlatformInteraction(command, {
          app: this.app,
          respond,
          context,
        });

        try {
          await command.handler(platformInteraction);
        } catch (error) {
          console.error(`Error executing ${command.name}:`, error);
          await platformInteraction.reply({
            content: 'There was an error executing this command!',
            ephemeral: true,
          });
        }
      });
    }
  }

  onButton(handler: (interaction: PlatformInteraction) => void | Promise<void>): void {
    this.buttonHandlers.push(handler);

    this.app.action(/./, async ({ body, ack, respond, context }) => {
      await ack();

      const platformInteraction = new SlackPlatformInteraction(body, {
        app: this.app,
        respond,
        context,
      });

      for (const h of this.buttonHandlers) {
        try {
          await h(platformInteraction);
        } catch (error) {
          console.error('Error handling button interaction:', error);
        }
      }
    });
  }

  onModal(handler: (interaction: PlatformInteraction) => void | Promise<void>): void {
    this.modalHandlers.push(handler);

    this.app.view(/./, async ({ body, ack, context }) => {
      // Note: Slack modals don't have a respond function
      const platformInteraction = new SlackPlatformInteraction(body, {
        app: this.app,
        respond: async () => {}, // No-op for modals
        context,
      });

      // Acknowledge the view submission
      await ack();

      for (const h of this.modalHandlers) {
        try {
          await h(platformInteraction);
        } catch (error) {
          console.error('Error handling modal submission:', error);
        }
      }
    });
  }

  onCommand(handler: (interaction: PlatformInteraction) => void | Promise<void>): void {
    this.commandHandlers.push(handler);
    // Commands are registered separately via registerCommands
  }

  async hasPermission(interaction: PlatformInteraction, permission: string): Promise<boolean> {
    // Slack permission check
    // Note: This is a simplified version. You may want to implement more granular permissions
    try {
      const user = await this.fetchUser(interaction.userId);
      if (user.metadata?.isBot) {
        return false;
      }

      // Check if user is an admin
      const result = await this.webClient.users.info({ user: interaction.userId });
      return result.user?.is_admin || false;
    } catch {
      return false;
    }
  }

  getRawClient(): App {
    return this.app;
  }

  private setupEventHandlers(): void {
    this.app.event('app_mention', async ({ event, client, context }) => {
      console.log(`App mentioned in channel ${event.channel}`);
    });

    this.app.event('message', async ({ event, context }) => {
      // Handle direct messages
      if (event.channel_type === 'im') {
        console.log(`DM received from user ${event.user}`);
      }
    });
  }

  private toSlackMessage(message: PlatformMessage): any {
    const slackMessage: any = {};

    if (message.content) {
      slackMessage.text = message.content;
    }

    if (message.embeds && message.embeds.length > 0) {
      const blocks: any[] = [];

      for (const embed of message.embeds) {
        if (embed.title) {
          blocks.push({
            type: 'header',
            text: {
              type: 'plain_text',
              text: embed.title,
              emoji: true,
            },
          });
        }

        if (embed.description) {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: embed.description,
            },
          });
        }

        if (embed.fields && embed.fields.length > 0) {
          for (let i = 0; i < embed.fields.length; i += 2) {
            const fields = [
              {
                type: 'mrkdwn',
                text: `*${embed.fields[i].name}*\n${embed.fields[i].value}`,
              },
            ];

            if (i + 1 < embed.fields.length) {
              fields.push({
                type: 'mrkdwn',
                text: `*${embed.fields[i + 1].name}*\n${embed.fields[i + 1].value}`,
              });
            }

            blocks.push({
              type: 'section',
              fields,
            });
          }
        }

        if (embed.footer) {
          blocks.push({
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: embed.footer.text,
              },
            ],
          });
        }
      }

      slackMessage.blocks = blocks;
    }

    if (message.components && message.components.length > 0) {
      const blocks = slackMessage.blocks || [];

      for (const component of message.components) {
        if (component.components) {
          const elements = component.components.map(comp => {
            if (comp.type === 'button') {
              return {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: comp.label || '',
                  emoji: true,
                },
                action_id: comp.customId || '',
                style: comp.style === 'danger' ? 'danger' : comp.style === 'success' ? 'primary' : 'default',
              };
            }
            return null;
          }).filter(Boolean);

          blocks.push({
            type: 'actions',
            elements,
          });
        }
      }

      slackMessage.blocks = blocks;
    }

    return slackMessage;
  }
}

/**
 * Create a singleton instance of the Slack adapter
 */
export function createSlackAdapter(): SlackAdapter {
  return new SlackAdapter();
}
