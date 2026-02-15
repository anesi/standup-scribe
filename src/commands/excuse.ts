import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { prisma } from '../lib/prisma';
import { DateTime } from 'luxon';

export const excuseCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('excuse')
      .setDescription('Manage user excusals from standup')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('add')
          .setDescription('Add excusal for a user')
          .addUserOption((option) =>
            option.setName('user').setDescription('User to excuse').setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('start')
              .setDescription('Start date (YYYY-MM-DD)')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option.setName('end').setDescription('End date (YYYY-MM-DD)').setRequired(true),
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for absence').setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('remove')
          .setDescription('Remove an excusal')
          .addUserOption((option) =>
            option.setName('user').setDescription('User').setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('date')
              .setDescription('Date of excusal to remove (YYYY-MM-DD)')
              .setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('list')
          .setDescription('List all excusals')
          .addUserOption((option) =>
            option.setName('user').setDescription('Filter by user').setRequired(false),
          ),
      ),

    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        });
        return;
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: 'You need "Manage Guild" permission to use this command.',
          ephemeral: true,
        });
        return;
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'add') {
        await handleAdd(interaction);
      } else if (subcommand === 'remove') {
        await handleRemove(interaction);
      } else if (subcommand === 'list') {
        await handleList(interaction);
      }
    },
  },
];

async function handleAdd(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const startDateStr = interaction.options.getString('start', true);
  const endDateStr = interaction.options.getString('end', true);
  const reason = interaction.options.getString('reason', true);
  const guildId = interaction.guildId!;

  // Parse dates
  const startDate = DateTime.fromISO(startDateStr).startOf('day');
  const endDate = DateTime.fromISO(endDateStr).startOf('day');

  if (!startDate.isValid || !endDate.isValid) {
    await interaction.editReply('Invalid date format. Use YYYY-MM-DD format.');
    return;
  }

  if (endDate < startDate) {
    await interaction.editReply('End date must be after start date.');
    return;
  }

  try {
    // Find or create roster member
    let rosterMember = await prisma.rosterMember.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId: user.id,
        },
      },
    });

    if (!rosterMember) {
      rosterMember = await prisma.rosterMember.create({
        data: {
          guildId,
          userId: user.id,
          username: user.username,
          displayName: user.username,
          isActive: true,
        },
      });
    }

    await prisma.excusal.create({
      data: {
        rosterMemberId: rosterMember.id,
        startDate: startDate.toJSDate(),
        endDate: endDate.toJSDate(),
        reason,
      },
    });

    // Audit log
    if (interaction.user) {
      await prisma.auditEvent.create({
        data: {
          guildId,
          actionType: 'EXCUSAL_CREATED',
          actorId: interaction.user.id,
          actorName: interaction.user.username,
          targetId: user.id,
          targetType: 'Excusal',
          details: { startDate: startDateStr, endDate: endDateStr, reason },
        },
      });
    }

    await interaction.editReply(
      `✅ Excused ${user.toString()} from ${startDateStr} to ${endDateStr}.\n**Reason:** ${reason}`,
    );
  } catch (error) {
    console.error('Excusal add error:', error);
    await interaction.editReply('Failed to add excusal.');
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const dateStr = interaction.options.getString('date', true);
  const guildId = interaction.guildId!;

  const targetDate = DateTime.fromISO(dateStr).startOf('day');

  if (!targetDate.isValid) {
    await interaction.editReply('Invalid date format. Use YYYY-MM-DD format.');
    return;
  }

  try {
    const rosterMember = await prisma.rosterMember.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId: user.id,
        },
      },
    });

    if (!rosterMember) {
      await interaction.editReply('User not found in roster.');
      return;
    }

    // Find excusals that cover this date
    const excusals = await prisma.excusal.findMany({
      where: {
        rosterMemberId: rosterMember.id,
        startDate: { lte: targetDate.toJSDate() },
        endDate: { gte: targetDate.toJSDate() },
      },
    });

    if (excusals.length === 0) {
      await interaction.editReply(`No excusal found for ${user.toString()} on ${dateStr}.`);
      return;
    }

    // Delete all matching excusals
    await prisma.excusal.deleteMany({
      where: {
        id: { in: excusals.map((e) => e.id) },
      },
    });

    // Audit log
    if (interaction.user) {
      await prisma.auditEvent.create({
        data: {
          guildId,
          actionType: 'EXCUSAL_REMOVED',
          actorId: interaction.user.id,
          actorName: interaction.user.username,
          targetId: user.id,
          targetType: 'Excusal',
          details: { date: dateStr },
        },
      });
    }

    await interaction.editReply(`✅ Removed excusal for ${user.toString()} on ${dateStr}.`);
  } catch (error) {
    console.error('Excusal remove error:', error);
    await interaction.editReply('Failed to remove excusal.');
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const user = interaction.options.getUser('user');
  const guildId = interaction.guildId!;

  try {
    const where: any = {
      rosterMember: {
        guildId,
      },
    };

    if (user) {
      where.rosterMember = {
        ...where.rosterMember,
        userId: user.id,
      };
    }

    const excusals = await prisma.excusal.findMany({
      where,
      include: {
        rosterMember: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    if (excusals.length === 0) {
      await interaction.editReply('No excusals found.');
      return;
    }

    const list = excusals
      .map((e) => {
        const start = DateTime.fromJSDate(e.startDate).toISODate();
        const end = DateTime.fromJSDate(e.endDate).toISODate();
        return `- **<@${e.rosterMember.userId}>**: ${start} to ${end}\n  _${e.reason}_`;
      })
      .join('\n\n');

    await interaction.editReply(`**Excusals:**\n\n${list}`);
  } catch (error) {
    console.error('Excusal list error:', error);
    await interaction.editReply('Failed to fetch excusals.');
  }
}
