import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { setupCommand } from './setup';
import { rosterCommands } from './roster';
import { excuseCommands } from './excuse';
import { runCommands } from './run';

// Export all command data and handlers
export const commands: Array<{
  data: any;
  execute: (interaction: any) => Promise<void>;
}> = [
  setupCommand,
  ...rosterCommands,
  ...excuseCommands,
  ...runCommands,
];

// Helper to get command data for registration
export function getCommandData(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return commands.map((cmd) => cmd.data);
}
