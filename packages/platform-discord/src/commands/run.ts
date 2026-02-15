import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '@standup-scribe/database';
import { DateTime } from 'luxon';
import { runStandup, closeStandup } from '../scheduler/standup-runner';
import { resendDelivery } from '@standup-scribe/integrations';
import { exportToCSV } from '@standup-scribe/integrations';

export const runCommands = [
  // Manual run
  {
    data: new SlashCommandBuilder()
      .setName('run')
      .setDescription('Manually trigger today\'s standup'),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: 'Server only command', ephemeral: true });
        return;
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: 'Need "Manage Guild" permission',
          ephemeral: true,
        });
        return;
      }
      await interaction.deferReply();
      try {
        await runStandup(interaction.guildId!);
        await interaction.editReply('✅ Standup run opened! DMs sent to active roster members.');
      } catch (error: any) {
        console.error('Run error:', error);
        await interaction.editReply(`Failed to run: ${error.message}`);
      }
    },
  },

  // Close run
  {
    data: new SlashCommandBuilder()
      .setName('close')
      .setDescription('Close standup and publish reports'),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: 'Server only command', ephemeral: true });
        return;
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: 'Need "Manage Guild" permission',
          ephemeral: true,
        });
        return;
      }
      await interaction.deferReply();
      try {
        await closeStandup(interaction.guildId!);
        await interaction.editReply('✅ Standup closed! Reports being published...');
      } catch (error: any) {
        console.error('Close error:', error);
        await interaction.editReply(`Failed to close: ${error.message}`);
      }
    },
  },

  // Status
  {
    data: new SlashCommandBuilder()
      .setName('status')
      .setDescription('Check standup delivery status')
      .addStringOption((option) =>
        option.setName('date').setDescription('Date (YYYY-MM-DD, default today)').setRequired(false),
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: 'Server only command', ephemeral: true });
        return;
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: 'Need "Manage Guild" permission',
          ephemeral: true,
        });
        return;
      }
      await interaction.deferReply({ ephemeral: true });

      const dateStr = interaction.options.getString('date');
      const workspaceId = interaction.guildId!;
      const config = await prisma.workspaceConfig.findUnique({ where: { workspaceId } });

      if (!config) {
        await interaction.editReply('Workspace not configured. Run /standup setup first.');
        return;
      }

      let targetDate = dateStr
        ? DateTime.fromISO(dateStr, { zone: config.timezone })
        : DateTime.now().setZone(config.timezone);

      if (!targetDate.isValid) {
        await interaction.editReply('Invalid date format. Use YYYY-MM-DD.');
        return;
      }

      targetDate = targetDate.startOf('day');

      const run = await prisma.standupRun.findUnique({
        where: {
          workspaceId_runDate: {
            workspaceId,
            runDate: targetDate.toJSDate(),
          },
        },
        include: {
          deliveryJobs: true,
          responses: {
            include: {
              rosterMember: true,
            },
          },
        },
      });

      if (!run) {
        await interaction.editReply(`No standup run found for ${targetDate.toISODate()}`);
        return;
      }

      // Build status embed
      const embed = new EmbedBuilder()
        .setTitle(`Standup Status — ${targetDate.toISODate()}`)
        .setColor(run.status === 'OPEN' ? 0x00ff00 : 0xffaa00)
        .addFields([
          {
            name: 'Run Status',
            value: run.status,
            inline: true,
          },
          {
            name: 'Responses',
            value: `${run.responses.filter((r) => r.status === 'SUBMITTED').length}/${run.responses.length} submitted`,
            inline: true,
          },
        ]);

      // Response breakdown
      const submitted = run.responses.filter((r) => r.status === 'SUBMITTED').length;
      const missing = run.responses.filter((r) => r.status === 'MISSING').length;
      const excused = run.responses.filter((r) => r.status === 'EXCUSED').length;
      const dmFailed = run.responses.filter((r) => r.status === 'DM_FAILED').length;

      embed.addFields([
        {
          name: 'Breakdown',
          value: `✅ Submitted: ${submitted}\n❌ Missing: ${missing}\n🏖️ Excused: ${excused}\n⚠️ DM Failed: ${dmFailed}`,
          inline: false,
        },
      ]);

      // Delivery status
      const deliveryStatus = run.deliveryJobs.map((job) => {
        const emoji =
          job.status === 'SUCCESS' ? '✅' : job.status === 'FAILED' ? '❌' : job.status === 'RETRYING' ? '🔄' : '⏳';
        let line = `${emoji} **${job.destination}**: ${job.status}`;
        if (job.lastError) {
          line += `\n   └─ Error: ${job.lastError.substring(0, 50)}...`;
        }
        if (job.nextAttemptAt && job.status === 'RETRYING') {
          line += `\n   └─ Next: ${DateTime.fromJSDate(job.nextAttemptAt).toRelative()}`;
        }
        return line;
      }).join('\n\n');

      if (deliveryStatus) {
        embed.addFields([{ name: 'Deliveries', value: deliveryStatus, inline: false }]);
      }

      await interaction.editReply({ embeds: [embed] });
    },
  },

  // Resend
  {
    data: new SlashCommandBuilder()
      .setName('resend')
      .setDescription('Retry failed delivery')
      .addStringOption((option) =>
        option.setName('date').setDescription('Date (YYYY-MM-DD, default today)').setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('destination')
          .setDescription('Destination to resend (default all)')
          .setRequired(false)
          .addChoices(
            { name: 'Discord', value: 'DISCORD' },
            { name: 'Sheets', value: 'SHEETS' },
            { name: 'Notion', value: 'NOTION' },
            { name: 'CSV', value: 'CSV' },
          ),
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: 'Server only command', ephemeral: true });
        return;
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: 'Need "Manage Guild" permission',
          ephemeral: true,
        });
        return;
      }
      await interaction.deferReply();

      const dateStr = interaction.options.getString('date');
      const destination = interaction.options.getString('destination') as any;
      const workspaceId = interaction.guildId!;
      const config = await prisma.workspaceConfig.findUnique({ where: { workspaceId } });

      if (!config) {
        await interaction.editReply('Workspace not configured.');
        return;
      }

      let targetDate = dateStr
        ? DateTime.fromISO(dateStr, { zone: config.timezone })
        : DateTime.now().setZone(config.timezone);

      if (!targetDate.isValid) {
        await interaction.editReply('Invalid date format.');
        return;
      }

      targetDate = targetDate.startOf('day');

      try {
        const count = await resendDelivery(workspaceId, targetDate.toJSDate(), destination);
        await interaction.editReply(`✅ Re-queued ${count} delivery job(s).`);
      } catch (error: any) {
        console.error('Resend error:', error);
        await interaction.editReply(`Failed to resend: ${error.message}`);
      }
    },
  },

  // Export
  {
    data: new SlashCommandBuilder()
      .setName('export')
      .setDescription('Export standup data to CSV')
      .addStringOption((option) =>
        option.setName('from').setDescription('Start date (YYYY-MM-DD)').setRequired(true),
      )
      .addStringOption((option) =>
        option.setName('to').setDescription('End date (YYYY-MM-DD)').setRequired(true),
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: 'Server only command', ephemeral: true });
        return;
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: 'Need "Manage Guild" permission',
          ephemeral: true,
        });
        return;
      }
      await interaction.deferReply();

      const fromStr = interaction.options.getString('from', true);
      const toStr = interaction.options.getString('to', true);
      const workspaceId = interaction.guildId!;
      const config = await prisma.workspaceConfig.findUnique({ where: { workspaceId } });

      if (!config) {
        await interaction.editReply('Workspace not configured.');
        return;
      }

      const fromDate = DateTime.fromISO(fromStr, { zone: config.timezone }).startOf('day');
      const toDate = DateTime.fromISO(toStr, { zone: config.timezone }).endOf('day');

      if (!fromDate.isValid || !toDate.isValid) {
        await interaction.editReply('Invalid date format. Use YYYY-MM-DD.');
        return;
      }

      if (toDate < fromDate) {
        await interaction.editReply('End date must be after start date.');
        return;
      }

      try {
        const filePath = await exportToCSV(workspaceId, fromDate.toJSDate(), toDate.toJSDate());

        await interaction.editReply({
          content: `Exported data from ${fromDate.toISODate()} to ${toDate.toISODate()}`,
          files: [filePath],
        });
      } catch (error: any) {
        console.error('Export error:', error);
        await interaction.editReply(`Failed to export: ${error.message}`);
      }
    },
  },
];
