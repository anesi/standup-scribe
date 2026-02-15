import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { prisma } from '@standup-scribe/database';
import { DateTime } from 'luxon';

export const setupCommand = {
  data: new SlashCommandBuilder()
    .setName('standup')
    .setDescription('Manage standup bot settings')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Configure workspace standup settings')
        .addChannelOption((option) =>
          option.setName('channel').setDescription('Management channel for reports').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('team_role').setDescription('Team role mention (e.g., @team)').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('timezone')
            .setDescription('Timezone (e.g., Africa/Lagos)')
            .setRequired(false)
            .addChoices(
              { name: 'Africa/Lagos', value: 'Africa/Lagos' },
              { name: 'UTC', value: 'UTC' },
              { name: 'America/New_York', value: 'America/New_York' },
              { name: 'America/Los_Angeles', value: 'America/Los_Angeles' },
              { name: 'Europe/London', value: 'Europe/London' },
              { name: 'Europe/Paris', value: 'Europe/Paris' },
            ),
        )
        .addStringOption((option) =>
          option.setName('window_open').setDescription('Window open time (HH:MM)').setRequired(false),
        )
        .addStringOption((option) =>
          option.setName('window_close').setDescription('Window close time (HH:MM)').setRequired(false),
        )
        .addStringOption((option) =>
          option.setName('reminders').setDescription('Reminder times (comma-separated HH:MM)').setRequired(false),
        )
        .addStringOption((option) =>
          option.setName('notion_page').setDescription('Notion parent page ID').setRequired(false),
        )
        .addStringOption((option) =>
          option.setName('sheets_id').setDescription('Google Sheets spreadsheet ID').setRequired(false),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      await handleSetup(interaction);
    }
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction) {
  // Check permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: 'You need "Manage Guild" permission to use this command.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const workspaceId = interaction.guildId!;
  const channel = interaction.options.getChannel('channel', true);
  const teamRole = interaction.options.getString('team_role', true);
  const timezone = interaction.options.getString('timezone') ?? 'Africa/Lagos';
  const windowOpen = interaction.options.getString('window_open') ?? '09:00';
  const windowClose = interaction.options.getString('window_close') ?? '16:00';
  const remindersStr = interaction.options.getString('reminders') ?? '10:00,12:00,14:00';
  const notionPage = interaction.options.getString('notion_page');
  const sheetsId = interaction.options.getString('sheets_id');

  // Validate timezone
  if (!DateTime.now().setZone(timezone).isValid) {
    await interaction.editReply(`Invalid timezone: ${timezone}`);
    return;
  }

  // Validate time format
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(windowOpen) || !timeRegex.test(windowClose)) {
    await interaction.editReply('Time values must be in HH:MM format (24-hour)');
    return;
  }

  const reminderTimes = remindersStr
    .split(',')
    .map((t) => t.trim())
    .filter((t) => timeRegex.test(t));

  if (reminderTimes.length > 3) {
    await interaction.editReply('Maximum 3 reminder times allowed');
    return;
  }

  try {
    // Upsert workspace config
    await prisma.workspaceConfig.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        managementChannelId: channel.id,
        teamRoleMention: teamRole,
        timezone,
        windowOpenTime: windowOpen,
        windowCloseTime: windowClose,
        reminderTimes,
        notionParentPageId: notionPage,
        googleSpreadsheetId: sheetsId,
      },
      update: {
        managementChannelId: channel.id,
        teamRoleMention: teamRole,
        timezone,
        windowOpenTime: windowOpen,
        windowCloseTime: windowClose,
        reminderTimes,
        notionParentPageId: notionPage,
        googleSpreadsheetId: sheetsId,
      },
    });

    // Audit log
    if (interaction.user) {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          actionType: 'SETUP_UPDATED',
          actorId: interaction.user.id,
          actorName: interaction.user.username,
          details: {
            channel: channel.id,
            timezone,
            windowOpen,
            windowClose,
            reminderTimes,
          },
        },
      });
    }

    await interaction.editReply(
      `✅ Standup configured successfully!\n\n` +
        `**Channel:** <#${channel.id}>\n` +
        `**Team Role:** ${teamRole}\n` +
        `**Timezone:** ${timezone}\n` +
        `**Window:** ${windowOpen} - ${windowClose}\n` +
        `**Reminders:** ${reminderTimes.join(', ') || 'None'}\n` +
        `**Notion:** ${notionPage || 'Not configured'}\n` +
        `**Sheets:** ${sheetsId || 'Not configured'}`,
    );
  } catch (error) {
    console.error('Setup error:', error);
    await interaction.editReply('Failed to save configuration. Please try again.');
  }
}
