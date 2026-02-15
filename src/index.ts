import dotenv from 'dotenv';
import { discordClient } from './clients/discord';
import { commands, getCommandData } from './commands';
import { startScheduler } from './scheduler';
import { startDeliveryWorker } from './deliveries';
import { startCleanupWorker } from './workers/cleanup-worker';
import { handleStandupInteraction, handleStandupAnswer } from './components/standup-flow';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:');
  missingVars.forEach((varName) => console.error(`  - ${varName}`));
  process.exit(1);
}

// Log environment
console.log(`Starting bot in ${process.env.ENVIRONMENT || 'development'} mode...`);

async function main() {
  // Register commands with Discord client
  for (const command of commands) {
    discordClient.addCommand(command.data.name, command);
  }

  // Login to Discord
  await discordClient.login(process.env.DISCORD_TOKEN!);

  // Wait for client to be ready
  await new Promise<void>((resolve) => {
    if (discordClient.isReady()) {
      resolve();
    } else {
      discordClient.getRawClient().once('ready', () => resolve());
    }
  });

  const clientId = discordClient.getRawClient().user?.id;
  if (!clientId) {
    throw new Error('Failed to get client ID');
  }

  // Register slash commands
  // In development, register as guild commands for instant updates
  // In production, register as global commands
  const guildId = process.env.TEST_GUILD_ID; // Optional: set this for faster command updates in dev

  await discordClient.registerCommands(getCommandData(), clientId, guildId);

  // Set up interaction handler for buttons
  const client = discordClient.getRawClient();

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {
      const customId = interaction.customId;

      // Handle standup flow start/continue buttons
      if (customId.startsWith('standup_start_') || customId.startsWith('standup_continue_')) {
        await interaction.deferReply();
        const result = await handleStandupInteraction(
          customId,
          interaction.user.id,
          interaction.user,
        );

        if (result.components) {
          await interaction.editReply({
            content: result.content,
            components: result.components,
          });
        } else {
          await interaction.editReply({
            content: result.content,
          });
        }
        return;
      }

      // Handle standup flow navigation buttons
      if (
        customId.startsWith('standup_next_') ||
        customId.startsWith('standup_back_') ||
        customId.startsWith('standup_nil_') ||
        customId.startsWith('standup_quickdate_') ||
        customId.startsWith('standup_submit_confirm')
      ) {
        await interaction.deferUpdate();

        let value = '';
        if (customId.startsWith('standup_quickdate_')) {
          value = customId.split('_').slice(3).join('_');
        }

        const result = await handleStandupAnswer(customId, interaction.user.id, value);

        if (result && result.components) {
          await interaction.editReply({
            content: result.content,
            components: result.components,
          });
        } else if (result) {
          await interaction.editReply({
            content: result.content,
          });
        }
        return;
      }

      // Handle expectation selection buttons
      if (customId.startsWith('standup_answer_expectations_')) {
        await interaction.deferUpdate();
        const value = customId.split('_').slice(3).join('_');
        const result = await handleStandupAnswer(customId, interaction.user.id, value);

        if (result && result.components) {
          await interaction.editReply({
            content: result.content,
            components: result.components,
          });
        } else if (result) {
          await interaction.editReply({
            content: result.content,
          });
        }
        return;
      }

    } catch (error) {
      console.error('Error handling button interaction:', error);

      const errorMessage = 'An error occurred processing your request.';

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  });

  // Start background workers
  startScheduler();
  startDeliveryWorker();
  startCleanupWorker();

  console.log('Bot is ready!');
}

main().catch((error) => {
  console.error('Fatal error starting bot:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  discordClient.getRawClient().destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  discordClient.getRawClient().destroy();
  process.exit(0);
});
