import { EmbedBuilder, TextChannel } from 'discord.js';
import { discordClient } from '../client/discord';
import { DateTime } from 'luxon';
import { generateCSV } from '@standup-scribe/integrations';
import { publishSheetsReport } from '@standup-scribe/integrations';
import { publishNotionReport } from '@standup-scribe/integrations';

export async function publishDiscordReport(run: any): Promise<void> {
  const client = discordClient.getRawClient();
  const guild = await client.guilds.fetch(run.workspaceId);

  const config = await guild.channels.fetch(run.workspace.managementChannelId);
  if (!config || !config.isTextBased()) {
    throw new Error('Management channel not found or not text-based');
  }

  const channel = config as TextChannel;
  const responses = run.responses || [];

  // Count statuses
  const submitted = responses.filter((r: any) => r.status === 'SUBMITTED').length;
  const missing = responses.filter((r: any) => r.status === 'MISSING').length;
  const excused = responses.filter((r: any) => r.status === 'EXCUSED').length;
  const dmFailed = responses.filter((r: any) => r.status === 'DM_FAILED').length;
  const total = responses.length;

  const runDate = DateTime.fromJSDate(run.runDate).toISODate()!;

  // Collect all risks and decisions
  const allRisks: string[] = [];
  const allDecisions: string[] = [];

  for (const response of responses) {
    if (response.status !== 'SUBMITTED') continue;

    const answers = response.answers || {};
    const member = response.rosterMember;

    if (answers.at_risk && Array.isArray(answers.at_risk)) {
      for (const risk of answers.at_risk) {
        if (risk && risk !== 'Nil') {
          allRisks.push(`**${member.displayName}**: ${risk}`);
        }
      }
    }

    if (answers.decisions && Array.isArray(answers.decisions)) {
      for (const decision of answers.decisions) {
        if (decision && decision !== 'Nil') {
          allDecisions.push(`**${member.displayName}**: ${decision}`);
        }
      }
    }
  }

  // Build embed
  const embed = new EmbedBuilder()
    .setTitle(`Daily Standup — ${runDate}`)
    .setColor(submitted > 0 ? 0x00ff00 : 0xffaa00)
    .addFields([
      {
        name: 'Summary',
        value: `**${submitted}/${total}** submitted | ${missing} missing | ${excused} excused | ${dmFailed} DM failed`,
        inline: false,
      },
    ]);

  if (allRisks.length > 0) {
    embed.addFields({
      name: '⚠️ Risks',
      value: allRisks.join('\n'),
      inline: false,
    });
  }

  if (allDecisions.length > 0) {
    embed.addFields({
      name: '📋 Decisions Needed',
      value: allDecisions.join('\n'),
      inline: false,
    });
  }

  // Generate links
  let linksText = '';
  let csvFile: string | null = null;

  try {
    if (run.guild.googleSpreadsheetId) {
      const sheetUrl = await publishSheetsReport(run);
      linksText += `📊 [Google Sheets](${sheetUrl})\n`;
    }
  } catch (error) {
    console.error('Failed to generate sheets link:', error);
  }

  try {
    if (run.guild.notionParentPageId) {
      const notionUrl = await publishNotionReport(run);
      linksText += `📝 [Notion](${notionUrl})\n`;
    }
  } catch (error) {
    console.error('Failed to generate notion link:', error);
  }

  try {
    csvFile = await generateCSV(run);
  } catch (error) {
    console.error('Failed to generate CSV:', error);
  }

  if (linksText) {
    embed.addFields({
      name: '🔗 Links',
      value: linksText,
      inline: false,
    });
  }

  // Send message
  if (csvFile) {
    await channel.send({
      content: run.guild.teamRoleMention,
      embeds: [embed],
      files: [csvFile],
    });
  } else {
    await channel.send({
      content: run.guild.teamRoleMention,
      embeds: [embed],
    });
  }
}
