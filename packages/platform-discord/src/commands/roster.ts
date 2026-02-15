import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { prisma } from '@standup-scribe/database';

export const rosterCommands = [
  // Add user to roster
  {
    data: new SlashCommandBuilder()
      .setName('roster')
      .setDescription('Manage standup roster')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('add')
          .setDescription('Add user to standup roster')
          .addUserOption((option) =>
            option.setName('user').setDescription('User to add').setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('remove')
          .setDescription('Remove user from standup roster')
          .addUserOption((option) =>
            option.setName('user').setDescription('User to remove').setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand.setName('list').setDescription('List all roster members'),
      ),

    async execute(interaction: ChatInputCommandInteraction) {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true,
        });
        return;
      }

      // Check permissions
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
  const workspaceId = interaction.guildId!;
  const member = await interaction.guild!.members.fetch(user.id);

  try {
    await prisma.rosterMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      create: {
        workspaceId,
        userId: user.id,
        username: user.username,
        displayName: member.displayName,
        isActive: true,
      },
      update: {
        isActive: true,
        username: user.username,
        displayName: member.displayName,
      },
    });

    // Audit log
    if (interaction.user) {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          actionType: 'ROSTER_ADDED',
          actorId: interaction.user.id,
          actorName: interaction.user.username,
          targetId: user.id,
          targetType: 'RosterMember',
          details: { username: user.username },
        },
      });
    }

    await interaction.editReply(`✅ Added ${user.toString()} to the standup roster.`);
  } catch (error) {
    console.error('Roster add error:', error);
    await interaction.editReply('Failed to add user to roster.');
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const user = interaction.options.getUser('user', true);
  const workspaceId = interaction.guildId!;

  try {
    await prisma.rosterMember.updateMany({
      where: {
        workspaceId,
        userId: user.id,
      },
      data: {
        isActive: false,
      },
    });

    // Audit log
    if (interaction.user) {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          actionType: 'ROSTER_REMOVED',
          actorId: interaction.user.id,
          actorName: interaction.user.username,
          targetId: user.id,
          targetType: 'RosterMember',
          details: { username: user.username },
        },
      });
    }

    await interaction.editReply(`✅ Removed ${user.toString()} from the standup roster.`);
  } catch (error) {
    console.error('Roster remove error:', error);
    await interaction.editReply('Failed to remove user from roster.');
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const workspaceId = interaction.guildId!;

  try {
    const members = await prisma.rosterMember.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    if (members.length === 0) {
      await interaction.editReply('No active roster members found.');
      return;
    }

    const memberList = members
      .map((m) => `- <@${m.userId}> (${m.displayName})`)
      .join('\n');

    await interaction.editReply(
      `**Standup Roster (${members.length} members):**\n\n${memberList}`,
    );
  } catch (error) {
    console.error('Roster list error:', error);
    await interaction.editReply('Failed to fetch roster.');
  }
}
