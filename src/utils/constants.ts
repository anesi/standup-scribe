// Standup flow step definitions
export const STANDUP_STEPS = [
  'what_working_on',
  'appetite',
  'start_date',
  'scheduled_done_date',
  'actual_done_date',
  'progress_today',
  'expectations',
  'at_risk',
  'decisions',
  'going_well',
  'going_poorly',
  'notes',
  'confirm',
] as const;

export type StandupStep = typeof STANDUP_STEPS[number];

// Step configuration
export const STEP_CONFIG: Record<
  StandupStep,
  { title: string; isList: boolean; isDate: boolean; isSelect: boolean; options?: string[] }
> = {
  what_working_on: {
    title: 'What are you working on?',
    isList: true,
    isDate: false,
    isSelect: false,
  },
  appetite: {
    title: "What's the appetite?",
    isList: false,
    isDate: false,
    isSelect: false,
  },
  start_date: {
    title: 'When did it start?',
    isList: false,
    isDate: true,
    isSelect: false,
  },
  scheduled_done_date: {
    title: 'When scheduled to be done?',
    isList: false,
    isDate: true,
    isSelect: false,
  },
  actual_done_date: {
    title: 'When actually done?',
    isList: false,
    isDate: true,
    isSelect: false,
  },
  progress_today: {
    title: 'What progress did you make today?',
    isList: true,
    isDate: false,
    isSelect: false,
  },
  expectations: {
    title: 'What are your expectations vs plan?',
    isList: false,
    isDate: false,
    isSelect: true,
    options: ['ABOVE', 'AT', 'BELOW', 'NIL'],
  },
  at_risk: {
    title: 'What is at risk?',
    isList: true,
    isDate: false,
    isSelect: false,
  },
  decisions: {
    title: 'What decisions need to be made?',
    isList: true,
    isDate: false,
    isSelect: false,
  },
  going_well: {
    title: 'What is going well?',
    isList: true,
    isDate: false,
    isSelect: false,
  },
  going_poorly: {
    title: 'What is going poorly?',
    isList: true,
    isDate: false,
    isSelect: false,
  },
  notes: {
    title: 'Any additional notes?',
    isList: false,
    isDate: false,
    isSelect: false,
  },
  confirm: {
    title: 'Confirm Submission',
    isList: false,
    isDate: false,
    isSelect: false,
  },
};

// Delivery backoff schedule in minutes
export const BACKOFF_SCHEDULE = [1, 5, 15, 60, 360, 1440]; // 1m, 5m, 15m, 1h, 6h, 24h
export const MAX_DELIVERY_ATTEMPTS = 8;

// Export Destination type for use in other modules
export type { Destination } from '@prisma/client';

// Discord message limits
export const MAX_DISCORD_MESSAGE_LENGTH = 2000;
export const MAX_EMBED_LENGTH = 4096;

// Date parsing patterns
export const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
  /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
];

// Quick date options
export const QUICK_DATE_OPTIONS = ['Today', 'Tomorrow', 'Next Week', 'Nil'] as const;
export type QuickDateOption = typeof QUICK_DATE_OPTIONS[number];
