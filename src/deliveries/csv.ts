import { promises as fs } from 'fs';
import path from 'path';
import { DateTime } from 'luxon';

// Type for standup answers
interface StandupAnswerJson {
  what_working_on?: string[];
  appetite?: string;
  start_date?: { raw: string; iso: string | null };
  scheduled_done_date?: { raw: string; iso: string | null };
  actual_done_date?: { raw: string; iso: string | null };
  progress_today?: string[];
  expectations?: string;
  at_risk?: string[];
  decisions?: string[];
  going_well?: string[];
  going_poorly?: string[];
  notes?: string;
}

export async function generateCSV(run: any): Promise<string> {
  const responses = run.responses || [];
  const runDate = DateTime.fromJSDate(run.runDate).toISODate()!;
  const fileName = `${runDate}.csv`;
  const filePath = path.join(process.cwd(), 'exports', fileName);

  // Ensure exports directory exists
  const exportsDir = path.join(process.cwd(), 'exports');
  await fs.mkdir(exportsDir, { recursive: true });

  // CSV Headers
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
    'SubmittedAt',
  ];

  // Build CSV rows
  const rows = responses.map((response: any) => {
    const answers = (response.answers || {}) as StandupAnswerJson;
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
      response.submittedAt ? DateTime.fromJSDate(response.submittedAt).toISO() : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`); // Escape CSV
  });

  const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');

  await fs.writeFile(filePath, csv, 'utf-8');

  console.log(`CSV generated: ${filePath}`);

  // Update delivery job if this was triggered by one
  if (run.deliveryJobs) {
    const csvJob = run.deliveryJobs.find((j: any) => j.destination === 'CSV');
    if (csvJob) {
      csvJob.filePath = filePath;
    }
  }

  return filePath;
}

/**
 * Export CSV for a date range
 */
export async function exportToCSV(
  guildId: string,
  fromDate: Date,
  toDate: Date,
): Promise<string> {
  const { prisma } = await import('../lib/prisma');

  const runs = await prisma.standupRun.findMany({
    where: {
      guildId,
      runDate: {
        gte: fromDate,
        lte: toDate,
      },
      status: 'CLOSED',
    },
    include: {
      responses: {
        include: {
          rosterMember: true,
        },
      },
    },
    orderBy: {
      runDate: 'desc',
    },
  });

  if (runs.length === 0) {
    throw new Error('No runs found in date range');
  }

  const from = DateTime.fromJSDate(fromDate).toISODate()!;
  const to = DateTime.fromJSDate(toDate).toISODate()!;
  const fileName = `export_${from}_to_${to}.csv`;
  const filePath = path.join(process.cwd(), 'exports', fileName);

  const headers = [
    'Date',
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
    'SubmittedAt',
  ];

  const rows: string[][] = [];

  for (const run of runs) {
    for (const response of run.responses) {
      const answers = (response.answers || {}) as StandupAnswerJson;
      const member = response.rosterMember;
      const runDate = DateTime.fromJSDate(run.runDate).toISODate()!;

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

      rows.push([
        runDate,
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
        response.submittedAt ? DateTime.fromJSDate(response.submittedAt).toISO() : '',
      ]);
    }
  }

  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  await fs.writeFile(filePath, csv, 'utf-8');

  return filePath;
}
