import dotenv from 'dotenv';
import { discordClient } from './clients/discord';
import { commands, getCommandData } from './commands';
import { startScheduler } from './scheduler';
import { startDeliveryWorker } from './deliveries';
import { startCleanupWorker } from './workers/cleanup-worker';
import { handleStandupInteraction, handleStandupAnswer, handleModalSubmit } from './components/standup-flow';

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

  // Set up interaction handler for buttons and modals
  const client = discordClient.getRawClient();

  client.on('interactionCreate', async (interaction) => {
    // Handle modals
    if (interaction.isModalSubmit()) {
      try {
        if (!interaction.customId.startsWith('standup:modal:')) {
          await interaction.reply({ content: 'Unknown modal', ephemeral: true });
          return;
        }

        // Extract form data from modal
        const formData: { [key: string]: string } = {};
        interaction.fields.fields.forEach((field: any) => {
          formData[field.customId] = field.value;
        });

        const result = await handleModalSubmit(
          interaction.customId,
          interaction.user.id,
          formData,
        );

        if (result) {
          if ('modal' in result) {
            // Cannot show modal from modal submit directly
            // Send a reply with a button to open the next modal
            await interaction.reply({
              content: 'Continue to the next step...',
              components: [],
              ephemeral: true,
            });
            // Note: Discord doesn't allow showing another modal from a modal submit
            // The user will need to use the "Continue" button from the original message
          } else if (result.components) {
            await interaction.reply({
              content: result.content,
              components: result.components,
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: result.content,
              ephemeral: true,
            });
          }
        }
      } catch (error) {
        console.error('Error handling modal submission:', error);
        const errorMessage = 'An error occurred processing your request.';
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
      return;
    }

    // Handle buttons
    if (!interaction.isButton()) return;

    try {
      const customId = interaction.customId;

      // Handle standup flow start/continue buttons
      if (customId.startsWith('standup:start:') || customId.startsWith('standup:continue:')) {
        const result = await handleStandupInteraction(
          customId,
          interaction.user.id,
          interaction.user,
        );

        if ('modal' in result) {
          await interaction.showModal(result.modal);
        } else if (result.components) {
          await interaction.reply({
            content: result.content,
            components: result.components,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: result.content,
            ephemeral: true,
          });
        }
        return;
      }

      // Handle standup flow navigation buttons (Nil, Back, Submit)
      if (
        customId.startsWith('standup:next:') ||
        customId.startsWith('standup:back:') ||
        customId.startsWith('standup:nil:') ||
        customId.startsWith('standup:submit:')
      ) {
        const result = await handleStandupAnswer(customId, interaction.user.id, '');

        if (result) {
          if ('modal' in result) {
            await interaction.showModal(result.modal);
          } else if (result.components) {
            await interaction.update({
              content: result.content,
              components: result.components,
            });
          } else {
            await interaction.update({
              content: result.content,
            });
          }
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
