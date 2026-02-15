/**
 * Slack Bot Application Entry Point
 *
 * This is the main entry point for the Slack bot application.
 * It initializes the Slack adapter and sets up all the commands and handlers.
 */

import dotenv from 'dotenv';
import { createSlackAdapter } from '@standup-scribe/platform-slack';
import { startScheduler } from '@standup-scribe/platform-slack/scheduler';
import { startDeliveryWorker } from '@standup-scribe/core/workers';
import { startCleanupWorker } from '@standup-scribe/core/workers';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:');
  missingVars.forEach((varName) => console.error(`  - ${varName}`));
  process.exit(1);
}

// Log environment
console.log(`Starting Slack bot in ${process.env.ENVIRONMENT || 'development'} mode...`);

async function main() {
  // Create and initialize the Slack adapter
  const slackAdapter = createSlackAdapter();

  // Register commands (to be implemented)
  // const slackCommands = await registerSlackCommands();
  // await slackAdapter.registerCommands(slackCommands);

  // Register button handlers (to be implemented)
  // slackAdapter.onButton(handleSlackButtonInteraction);

  // Register modal handlers (to be implemented)
  // slackAdapter.onModal(handleSlackModalSubmit);

  // Start the Slack app
  await slackAdapter.start();

  // Start background workers
  // Note: These need to be updated to work with the new platform-agnostic architecture
  // startScheduler(slackAdapter);
  // startDeliveryWorker();
  // startCleanupWorker();

  console.log('Slack bot is ready!');
}

main().catch((error) => {
  console.error('Fatal error starting Slack bot:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  // The Slack adapter will handle cleanup
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  // The Slack adapter will handle cleanup
  process.exit(0);
});
