import { createSheetsClient } from '../clients/sheets';
import { DateTime } from 'luxon';

export async function publishSheetsReport(run: any): Promise<string | null> {
  const client = createSheetsClient();
  if (!client) {
    throw new Error('Google Sheets not configured');
  }

  const responses = run.responses || [];
  const runDate = DateTime.fromJSDate(run.runDate);
  const tabName = runDate.toFormat('yyyy-MM-dd');

  // Headers
  const headers = [
    'Person',
    'What working on',
    'Appetite',
    'Start date',
    'Scheduled done',
    'Actual done',
    'Progress',
    'Expectations',
    'At risk',
    'Decisions',
    'Going well',
    'Going poorly',
    'Notes',
    'Status',
  ];

  // Build rows
  const rows = responses.map((response: any) => {
    const answers = response.answers || {};
    const member = response.rosterMember;

    const formatList = (val: any) => {
      if (Array.isArray(val)) {
        return val.filter((v: any) => v && v !== 'Nil').join('\n');
      }
      return val || '';
    };

    const formatDate = (val: any) => {
      if (typeof val === 'object' && val !== null) {
        return val.raw || '';
      }
      return val || '';
    };

    return [
      member.displayName,
      formatList(answers.what_working_on),
      answers.appetite || '',
      formatDate(answers.start_date),
      formatDate(answers.scheduled_done_date),
      formatDate(answers.actual_done_date),
      formatList(answers.progress_today),
      answers.expectations || '',
      formatList(answers.at_risk),
      formatList(answers.decisions),
      formatList(answers.going_well),
      formatList(answers.going_poorly),
      answers.notes || '',
      response.status,
    ];
  });

  await client.createOrUpdateTab(tabName, headers, rows);

  return await client.getTabUrl(tabName);
}
