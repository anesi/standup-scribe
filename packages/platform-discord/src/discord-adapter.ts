/**
 * Discord Platform Adapter
 *
 * Implements the PlatformAdapter interface for Discord
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
  PlatformComponent,
} from '@standup-scribe/core';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  Guild,
  User,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

/**
 * Discord-specific interaction wrapper
 */
class DiscordPlatformInteraction implements PlatformInteraction {
  constructor(
    private interaction: ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction,
  ) {}

  get id(): string {
    return this.interaction.id;
  }

  get type(): 'command' | 'button' | 'modal' | 'select' {
    if (this.interaction.isChatInputCommand()) return 'command';
    if (this.interaction.isButton()) return 'button';
    if (this.interaction.isModalSubmit()) return 'modal';
    return 'command'; // Default
  }

  get userId(): string {
    return this.interaction.user.id;
  }

  get channelId(): string {
    return this.interaction.channelId || '';
  }

  get workspaceId(): string {
    return this.interaction.guildId || '';
  }

  get customId(): string | undefined {
    if ('customId' in this.interaction) {
      return this.interaction.customId;
    }
    return undefined;
  }

  get values(): Record<string, string> | undefined {
    if (this.interaction.isModalSubmit()) {
      const values: Record<string, string> = {};
      for (const [key, value] of Object.entries(this.interaction.fields)) {
        values[key] = value as string;
      }
      return values;
    }
    return undefined;
  }

  get metadata(): Record<string, unknown> {
    return {
      isDM: !this.interaction.inGuild(),
      locale: this.interaction.locale,
      guildLocale: 'guildLocale' in this.interaction ? this.interaction.guildLocale : undefined,
    };
  }

  async reply(message: PlatformMessage): Promise<void> {
    const discordMessage = this.toDiscordMessage(message);
    if (this.interaction.replied || this.interaction.deferred) {
      await this.interaction.followUp({ ...discordMessage, ephemeral: message.ephemeral });
    } else {
      await this.interaction.reply({ ...discordMessage, ephemeral: message.ephemeral });
    }
  }

  async deferReply(): Promise<void> {
    if (this.interaction.replied || this.interaction.deferred) {
      return;
    }
    await this.interaction.deferReply({ ephemeral: true });
  }

  async update(message: PlatformMessage): Promise<void> {
    const discordMessage = this.toDiscordMessage(message);
    if ('update' in this.interaction) {
      await this.interaction.update(discordMessage);
    } else if ('editReply' in this.interaction) {
      await this.interaction.editReply(discordMessage);
    }
  }

  async deferUpdate(): Promise<void> {
    if ('deferUpdate' in this.interaction) {
      await this.interaction.deferUpdate();
    } else if ('deferReply' in this.interaction) {
      await this.interaction.deferReply();
    }
  }

  async showModal(modal: PlatformModal): Promise<void> {
    const discordModal = this.toDiscordModal(modal);
    if ('showModal' in this.interaction) {
      await this.interaction.showModal(discordModal);
    }
  }

  private toDiscordMessage(message: PlatformMessage): any {
    const discordMessage: any = {
      content: message.content,
      ephemeral: message.ephemeral,
    };

    if (message.embeds && message.embeds.length > 0) {
      discordMessage.embeds = message.embeds.map(embed => {
        const embedBuilder = new EmbedBuilder();
        if (embed.title) embedBuilder.setTitle(embed.title);
        if (embed.description) embedBuilder.setDescription(embed.description);
        if (embed.url) embedBuilder.setURL(embed.url);
        if (embed.color) embedBuilder.setColor(embed.color);
        if (embed.fields) {
          embedBuilder.addFields(
            embed.fields.map(field => ({
              name: field.name,
              value: field.value,
              inline: field.inline,
            }))
          );
        }
        if (embed.footer) {
          embedBuilder.setFooter({
            text: embed.footer.text,
            iconURL: embed.footer.iconUrl,
          });
        }
        if (embed.timestamp) embedBuilder.setTimestamp(embed.timestamp);
        return embedBuilder;
      });
    }

    if (message.components && message.components.length > 0) {
      discordMessage.components = message.components.map(component =>
        this.toDiscordActionRow(component)
      );
    }

    return discordMessage;
  }

  private toDiscordActionRow(component: PlatformComponent): any {
    const actionRow = new ActionRowBuilder<any>();

    if (component.components) {
      for (const comp of component.components) {
        if (comp.type === 'button') {
          const button = new ButtonBuilder()
            .setLabel(comp.label || '')
            .setCustomId(comp.customId || '')
            .setDisabled(comp.disabled || false);

          switch (comp.style) {
            case 'primary':
              button.setStyle(1); // Primary
              break;
            case 'secondary':
              button.setStyle(2); // Secondary
              break;
            case 'success':
              button.setStyle(3); // Success
              break;
            case 'danger':
              button.setStyle(4); // Danger
              break;
            case 'link':
              button.setStyle(5).setURL(comp.url || '');
              break;
            default:
              button.setStyle(1); // Default to primary
          }

          actionRow.addComponents(button);
        }
      }
    }

    return actionRow;
  }

  private toDiscordModal(modal: PlatformModal): ModalBuilder {
    const modalBuilder = new ModalBuilder()
      .setTitle(modal.title)
      .setCustomId(modal.customId);

    for (const comp of modal.components) {
      const textInput = new TextInputBuilder()
        .setLabel(comp.label)
        .setCustomId(comp.customId)
        .setStyle(comp.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(comp.required ?? true);

      if (comp.placeholder) textInput.setPlaceholder(comp.placeholder);
      if (comp.value) textInput.setValue(comp.value);
      if (comp.minLength) textInput.setMinLength(comp.minLength);
      if (comp.maxLength) textInput.setMaxLength(comp.maxLength);

      const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
      modalBuilder.addComponents(actionRow);
    }

    return modalBuilder;
  }
}

/**
 * Discord Platform Adapter Implementation
 */
export class DiscordAdapter implements PlatformAdapter {
  readonly platformType: PlatformType = 'discord';

  private client: Client;
  private commands: Map<string, PlatformCommand>;
  private buttonHandlers: Array<(interaction: PlatformInteraction) => void | Promise<void>>;
  private modalHandlers: Array<(interaction: PlatformInteraction) => void | Promise<void>>;
  private commandHandlers: Array<(interaction: PlatformInteraction) => void | Promise<void>>;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.commands = new Map();
    this.buttonHandlers = [];
    this.modalHandlers = [];
    this.commandHandlers = [];

    this.setupEventHandlers();
  }

  async initialize(token: string): Promise<void> {
    // Token is passed to login(), this is a no-op for Discord
  }

  async start(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN environment variable is not set');
    }
    await this.client.login(token);

    // Wait for client to be ready
    await new Promise<void>((resolve) => {
      if (this.client.isReady()) {
        resolve();
      } else {
        this.client.once('ready', () => resolve());
      }
    });
  }

  async stop(): Promise<void> {
    await this.client.destroy();
  }

  async fetchUser(userId: string): Promise<PlatformUser> {
    const user = await this.client.users.fetch(userId);
    return this.toPlatformUser(user);
  }

  async fetchWorkspace(workspaceId: string): Promise<PlatformWorkspace> {
    const guild = await this.client.guilds.fetch(workspaceId);
    return this.toPlatformWorkspace(guild);
  }

  async sendDirectMessage(userId: string, message: PlatformMessage): Promise<void> {
    const user = await this.client.users.fetch(userId);
    const discordMessage = this.toDiscordMessage(message);
    await user.send(discordMessage);
  }

  async sendChannelMessage(channelId: string, message: PlatformMessage): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !('send' in channel)) {
      throw new Error(`Channel ${channelId} not found or does not support sending messages`);
    }
    const discordMessage = this.toDiscordMessage(message);
    await channel.send(discordMessage);
  }

  async replyToInteraction(interaction: PlatformInteraction, message: PlatformMessage): Promise<void> {
    await interaction.reply(message);
  }

  async showModal(interaction: PlatformInteraction, modal: PlatformModal): Promise<void> {
    await interaction.showModal(modal);
  }

  async registerCommands(commands: PlatformCommand[], workspaceId?: string): Promise<void> {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN environment variable is not set');
    }

    const clientId = this.client.user?.id;
    if (!clientId) {
      throw new Error('Client not ready or user ID not available');
    }

    // Store commands for later use
    for (const command of commands) {
      this.commands.set(command.name, command);
    }

    // Convert to Discord slash command format
    const discordCommands = commands.map(cmd => {
      const builder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);

      // Add options
      for (const option of cmd.options) {
        switch (option.type) {
          case 'string':
            builder.addStringOption(opt => {
              opt.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false);
              if (option.choices) {
                opt.addChoices(...option.choices.map(c => ({ name: c.name, value: String(c.value) })));
              }
              return opt;
            });
            break;
          case 'boolean':
            builder.addBooleanOption(opt => {
              opt.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false);
              return opt;
            });
            break;
          case 'integer':
            builder.addIntegerOption(opt => {
              opt.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false);
              if (option.choices) {
                opt.addChoices(...option.choices.map(c => ({ name: c.name, value: c.value as number })));
              }
              return opt;
            });
            break;
          case 'user':
            builder.addUserOption(opt => {
              opt.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false);
              return opt;
            });
            break;
          case 'channel':
            builder.addChannelOption(opt => {
              opt.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false);
              return opt;
            });
            break;
          case 'role':
            builder.addRoleOption(opt => {
              opt.setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required ?? false);
              return opt;
            });
            break;
        }
      }

      return builder;
    });

    // Register commands with Discord
    const rest = new REST({ version: '10' }).setToken(token);

    try {
      console.log(`Started refreshing ${discordCommands.length} application (/) commands.`);

      const route = workspaceId
        ? Routes.applicationGuildCommands(clientId, workspaceId)
        : Routes.applicationCommands(clientId);

      const data = await rest.put(route, {
        body: discordCommands.map(cmd => cmd.toJSON()),
      });

      console.log(`Successfully reloaded ${Array.isArray(data) ? data.length : 0} application (/) commands.`);
    } catch (error) {
      console.error('Error registering commands:', error);
      throw error;
    }
  }

  onButton(handler: (interaction: PlatformInteraction) => void | Promise<void>): void {
    this.buttonHandlers.push(handler);
  }

  onModal(handler: (interaction: PlatformInteraction) => void | Promise<void>): void {
    this.modalHandlers.push(handler);
  }

  onCommand(handler: (interaction: PlatformInteraction) => void | Promise<void>): void {
    this.commandHandlers.push(handler);
  }

  async hasPermission(interaction: PlatformInteraction, permission: string): Promise<boolean> {
    // Discord-specific permission check
    if (interaction.metadata?.isDM) {
      return false;
    }

    const discordInteraction = (interaction as any).interaction as ChatInputCommandInteraction;
    if (!discordInteraction.memberPermissions) {
      return false;
    }

    // Map common permission names to Discord permission flags
    const permissionMap: Record<string, bigint> = {
      'administrator': 0x8n,
      'manage_guild': 0x20n,
      'manage_roles': 0x10000000n,
      'kick_members': 0x2n,
      'ban_members': 0x4n,
    };

    const discordPermission = permissionMap[permission.toLowerCase()];
    if (discordPermission) {
      return (discordInteraction.memberPermissions.bitfield & discordPermission) === discordPermission;
    }

    return false;
  }

  getRawClient(): Client {
    return this.client;
  }

  private setupEventHandlers(): void {
    this.client.once('ready', () => {
      console.log(`Logged in as ${this.client.user?.tag}!`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      try {
        if (interaction.isButton()) {
          const platformInteraction = new DiscordPlatformInteraction(interaction);
          for (const handler of this.buttonHandlers) {
            await handler(platformInteraction);
          }
        } else if (interaction.isModalSubmit()) {
          const platformInteraction = new DiscordPlatformInteraction(interaction);
          for (const handler of this.modalHandlers) {
            await handler(platformInteraction);
          }
        } else if (interaction.isChatInputCommand()) {
          const platformInteraction = new DiscordPlatformInteraction(interaction);

          // Check if we have a registered command handler
          const command = this.commands.get(interaction.commandName);
          if (command) {
            await command.handler(platformInteraction);
          }

          // Also call general command handlers
          for (const handler of this.commandHandlers) {
            await handler(platformInteraction);
          }
        }
      } catch (error) {
        console.error('Error handling interaction:', error);

        const errorMessage = 'An error occurred processing your request.';

        if ('replied' in interaction && (interaction.replied || interaction.deferred)) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else if ('reply' in interaction) {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    });
  }

  private toPlatformUser(user: User): PlatformUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.displayAvatarURL(),
      metadata: {
        discriminator: user.discriminator,
        bot: user.bot,
      },
    };
  }

  private toPlatformWorkspace(guild: Guild): PlatformWorkspace {
    return {
      id: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL() || undefined,
      metadata: {
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
        features: guild.features,
      },
    };
  }

  private toDiscordMessage(message: PlatformMessage): any {
    const discordMessage: any = {
      content: message.content,
    };

    if (message.embeds && message.embeds.length > 0) {
      discordMessage.embeds = message.embeds.map(embed => {
        const embedBuilder = new EmbedBuilder();
        if (embed.title) embedBuilder.setTitle(embed.title);
        if (embed.description) embedBuilder.setDescription(embed.description);
        if (embed.url) embedBuilder.setURL(embed.url);
        if (embed.color) embedBuilder.setColor(embed.color);
        if (embed.fields) {
          embedBuilder.addFields(
            embed.fields.map(field => ({
              name: field.name,
              value: field.value,
              inline: field.inline,
            }))
          );
        }
        if (embed.footer) {
          embedBuilder.setFooter({
            text: embed.footer.text,
            iconURL: embed.footer.iconUrl,
          });
        }
        if (embed.timestamp) embedBuilder.setTimestamp(embed.timestamp);
        return embedBuilder;
      });
    }

    if (message.components && message.components.length > 0) {
      discordMessage.components = message.components.map(component =>
        this.toDiscordActionRow(component)
      );
    }

    return discordMessage;
  }

  private toDiscordActionRow(component: PlatformComponent): any {
    const actionRow = new ActionRowBuilder<any>();

    if (component.components) {
      for (const comp of component.components) {
        if (comp.type === 'button') {
          const button = new ButtonBuilder()
            .setLabel(comp.label || '')
            .setCustomId(comp.customId || '')
            .setDisabled(comp.disabled || false);

          switch (comp.style) {
            case 'primary':
              button.setStyle(1); // Primary
              break;
            case 'secondary':
              button.setStyle(2); // Secondary
              break;
            case 'success':
              button.setStyle(3); // Success
              break;
            case 'danger':
              button.setStyle(4); // Danger
              break;
            case 'link':
              button.setStyle(5).setURL(comp.url || '');
              break;
            default:
              button.setStyle(1); // Default to primary
          }

          actionRow.addComponents(button);
        }
      }
    }

    return actionRow;
  }
}

/**
 * Create a singleton instance of the Discord adapter
 */
export function createDiscordAdapter(): DiscordAdapter {
  return new DiscordAdapter();
}
