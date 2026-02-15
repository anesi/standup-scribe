/**
 * Message Types
 *
 * Platform-agnostic message types for common standup messages
 */

import { PlatformMessage, PlatformEmbed, PlatformComponent } from './platform.interface';

/**
 * Create a plain text message
 */
export function createTextMessage(content: string, ephemeral = false): PlatformMessage {
  return { content, ephemeral };
}

/**
 * Create an error message
 */
export function createErrorMessage(error: string): PlatformMessage {
  return {
    content: `❌ Error: ${error}`,
    ephemeral: true,
  };
}

/**
 * Create a success message
 */
export function createSuccessMessage(message: string): PlatformMessage {
  return {
    content: `✅ ${message}`,
    ephemeral: true,
  };
}

/**
 * Create an info message
 */
export function createInfoMessage(message: string): PlatformMessage {
  return {
    content: `ℹ️ ${message}`,
    ephemeral: true,
  };
}

/**
 * Create a standup welcome message
 */
export function createStandupWelcomeMessage(): PlatformMessage {
  return {
    content: '👋 Welcome to Standup! Please answer the following questions.',
    ephemeral: false,
  };
}

/**
 * Create a standup completion message
 */
export function createStandupCompletionMessage(): PlatformMessage {
  return {
    content: '✅ Thank you for completing your standup! Your responses have been recorded.',
    ephemeral: false,
  };
}

/**
 * Create a standup reminder message
 */
export function createStandupReminderMessage(): PlatformMessage {
  return {
    content: '🔔 Reminder: Please complete your standup today!',
    ephemeral: false,
  };
}

/**
 * Create a report embed for standup results
 */
export function createStandupReportEmbed(data: {
  date: string;
  totalMembers: number;
  submitted: number;
  excused: number;
  missing: number;
  dmFailed: number;
}): PlatformEmbed {
  const { date, totalMembers, submitted, excused, missing, dmFailed } = data;

  return {
    title: '📊 Standup Report',
    description: `Standup results for **${date}**`,
    color: 0x00ff00,
    fields: [
      {
        name: '📋 Total Members',
        value: totalMembers.toString(),
        inline: true,
      },
      {
        name: '✅ Submitted',
        value: submitted.toString(),
        inline: true,
      },
      {
        name: '🏖️ Excused',
        value: excused.toString(),
        inline: true,
      },
      {
        name: '❌ Missing',
        value: missing.toString(),
        inline: true,
      },
      {
        name: '⚠️ DM Failed',
        value: dmFailed.toString(),
        inline: true,
      },
    ],
    timestamp: new Date(),
  };
}

/**
 * Create a button component
 */
export function createButton(options: {
  label: string;
  customId: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
}): PlatformComponent {
  const { label, customId, style = 'primary', disabled = false } = options;

  return {
    type: 'button',
    label,
    customId,
    style,
    disabled,
  };
}

/**
 * Create an action row with components
 */
export function createActionRow(components: PlatformComponent[]): PlatformComponent {
  return {
    type: 'action_row',
    components,
  };
}

/**
 * Create start/continue standup buttons
 */
export function createStandupActionButtons(workspaceId: string): PlatformComponent[] {
  return [
    createActionRow([
      createButton({
        label: '📝 Start Standup',
        customId: `standup_start_${workspaceId}`,
        style: 'success',
      }),
      createButton({
        label: '▶️ Continue',
        customId: `standup_continue_${workspaceId}`,
        style: 'primary',
      }),
    ]),
  ];
}

/**
 * Create navigation buttons for standup flow
 */
export function createStandupNavigationButtons(currentQuestion: number): PlatformComponent[] {
  return [
    createActionRow([
      createButton({
        label: '⬅️ Back',
        customId: `standup_back_${currentQuestion}`,
        style: 'secondary',
      }),
      createButton({
        label: '➡️ Next',
        customId: `standup_next_${currentQuestion}`,
        style: 'primary',
      }),
      createButton({
        label: '🚫 N/A',
        customId: `standup_nil_${currentQuestion}`,
        style: 'danger',
      }),
    ]),
  ];
}

/**
 * Create submit confirmation button
 */
export function createSubmitConfirmationButton(): PlatformComponent[] {
  return [
    createActionRow([
      createButton({
        label: '✅ Submit Standup',
        customId: 'standup_submit_confirm',
        style: 'success',
      }),
      createButton({
        label: '⬅️ Review',
        customId: 'standup_back_13',
        style: 'secondary',
      }),
    ]),
  ];
}

/**
 * Create date quick selection buttons
 */
export function createDateQuickButtons(): PlatformComponent[] {
  const buttons = [
    createButton({
      label: 'Today',
      customId: 'standup_quickdate_today',
      style: 'secondary',
    }),
    createButton({
      label: 'Yesterday',
      customId: 'standup_quickdate_yesterday',
      style: 'secondary',
    }),
    createButton({
      label: 'Tomorrow',
      customId: 'standup_quickdate_tomorrow',
      style: 'secondary',
    }),
    createButton({
      label: 'This Week',
      customId: 'standup_quickdate_this_week',
      style: 'secondary',
    }),
  ];

  return [createActionRow(buttons)];
}

/**
 * Create expectation selection buttons
 */
export function createExpectationButtons(workspaceId: string): PlatformComponent[] {
  const expectations = [
    { label: '📦 Deliverable', value: 'deliverable' },
    { label: '🎯 Milestone', value: 'milestone' },
    { label: '📝 Documentation', value: 'documentation' },
    { label: '🔧 Maintenance', value: 'maintenance' },
    { label: '💬 Meeting', value: 'meeting' },
    { label: '📚 Learning', value: 'learning' },
    { label: '🤝 Collaboration', value: 'collaboration' },
    { label: '🔍 Research', value: 'research' },
  ];

  return [createActionRow(expectations.map(({ label, value }) => createButton({
    label,
    customId: `standup_answer_expectations_${workspaceId}_${value}`,
    style: 'secondary',
  })))];
}

/**
 * Create a modal for standup questions
 */
export interface StandupModalOptions {
  title: string;
  customId: string;
  question: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  maxLength?: number;
}

export function createStandupModal(options: StandupModalOptions): any {
  // Note: This is a placeholder. The actual modal structure
  // will be implemented by each platform adapter
  return {
    title: options.title,
    customId: options.customId,
    components: [
      {
        type: 'text_input',
        label: options.question,
        customId: 'answer',
        placeholder: options.placeholder,
        value: options.value,
        required: options.required ?? true,
        maxLength: options.maxLength,
        style: 'paragraph',
      },
    ],
  };
}

/**
 * Format standup answers for display
 */
export function formatStandupAnswers(answers: Record<number, string>, questions: Array<{ id: number; key: string; text: string }>): string {
  let formatted = '';

  const sortedAnswers = Object.entries(answers).sort(([a], [b]) => parseInt(a) - parseInt(b));

  for (const [questionId, answer] of sortedAnswers) {
    const question = questions.find(q => q.id === parseInt(questionId));
    if (question) {
      formatted += `**${question.text}**\n${answer || '*(No answer)*'}\n\n`;
    }
  }

  return formatted.trim();
}
