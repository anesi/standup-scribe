import { createNotionClient } from '../clients/notion';
import { DateTime } from 'luxon';

export async function publishNotionReport(run: any): Promise<string | null> {
  const client = createNotionClient();
  if (!client) {
    throw new Error('Notion not configured');
  }

  const responses = run.responses || [];
  const runDate = DateTime.fromJSDate(run.runDate);
  const dateStr = runDate.toISODate()!;
  const weekday = runDate.toFormat('cccc');

  // Prepare member responses
  const memberResponses = responses.map((response: any) => ({
    displayName: response.rosterMember.displayName,
    answers: response.answers || {},
    status: response.status,
  }));

  const pageId = await client.createStandupPage(dateStr, weekday, memberResponses);

  return client.getPageUrl(pageId);
}
