import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  User,
} from 'discord.js';
import { prisma } from '../lib/prisma';
import { standupStateManager, StandupAnswers } from '../services/standup-state';
import { STEP_CONFIG, STANDUP_STEPS, StandupStep, QUICK_DATE_OPTIONS } from '../utils/constants';

/**
 * Handle standup button interactions
 */
export async function handleStandupInteraction(
  customId: string,
  userId: string,
  _user: User,
): Promise<{ content: string; components?: any[] }> {
  // Parse custom_id: standup_start_{rosterMemberId}_{runId} or standup_continue_{rosterMemberId}_{runId}
  const parts = customId.split('_');
  const action = parts[1]; // 'start' or 'continue'
  const rosterMemberId = parts[2];
  const runId = parts[3];

  // Verify the user matches the roster member
  const rosterMember = await prisma.rosterMember.findUnique({
    where: { id: rosterMemberId },
    include: { excusals: true },
  });

  if (!rosterMember || rosterMember.userId !== userId) {
    return {
      content: 'You are not authorized to perform this action.',
    };
  }

  // Check if run is still open
  const run = await prisma.standupRun.findUnique({
    where: { id: runId },
  });

  if (!run || run.status !== 'OPEN') {
    return {
      content: 'This standup run is closed.',
    };
  }

  // Get workspace config for timezone
  const config = await prisma.workspaceConfig.findUnique({
    where: { id: run.guildId },
  });

  if (!config) {
    return {
      content: 'Workspace configuration error.',
    };
  }

  // Get or create user state
  let state = await standupStateManager.getUserState(userId);

  if (!state) {
    state = await standupStateManager.createOrUpdateState(userId, rosterMemberId, runId);
  } else if (action === 'start' && state.currentStep !== 'what_working_on') {
    // Reset if starting fresh
    state.currentStep = 'what_working_on';
    state.answers = {
      what_working_on: [],
      appetite: '',
      start_date: { raw: '', iso: null },
      scheduled_done_date: { raw: '', iso: null },
      actual_done_date: { raw: '', iso: null },
      progress_today: [],
      expectations: '',
      at_risk: [],
      decisions: [],
      going_well: [],
      going_poorly: [],
      notes: '',
    };
  }

  // Show current step
  return renderStep(state.currentStep, state.answers as StandupAnswers, config.timezone);
}

/**
 * Handle answer submission for a step
 */
export async function handleStandupAnswer(
  customId: string,
  userId: string,
  value: string,
): Promise<{ content: string; components?: any[] } | null> {
  const parts = customId.split('_');

  // Parse action from parts[0] or parts[0] + '_' + parts[1]
  // Examples: 'standup_next_{step}', 'standup_back_confirm', 'standup_nil_{step}'
  let action: string;
  let step: StandupStep = 'what_working_on';
  let stepIndex = 2;

  if (parts[0] === 'standup') {
    if (parts[1] === 'answer' || parts[1] === 'nil' || parts[1] === 'next' || parts[1] === 'back') {
      action = parts[1]; // 'answer', 'nil', 'next', 'back'
      if (parts[2] && parts[2] !== 'confirm') {
        step = parts[2] as StandupStep;
        stepIndex = 3;
      }
    } else if (parts[1] === 'quickdate') {
      action = 'quickdate';
      step = parts[2] as StandupStep;
      stepIndex = 3;
    } else if (parts[1] === 'submit') {
      action = 'submit';
    } else {
      // Unknown action
      return null;
    }
  } else {
    return null;
  }

  const state = await standupStateManager.getUserState(userId);

  if (!state) {
    return {
      content: 'Session expired. Please start a new standup.',
    };
  }

  const config = await prisma.workspaceConfig.findFirst({
    where: { rosterMembers: { some: { userId } } },
  });

  const timezone = config?.timezone ?? 'utc';

  // Extract value if provided (for answer/quickdate)
  if (stepIndex < parts.length) {
    value = parts.slice(stepIndex).join('_');
  }

  // Handle different actions
  if (action === 'answer') {
    await standupStateManager.updateAnswer(userId, step, value, timezone);
  } else if (action === 'nil') {
    await standupStateManager.updateAnswer(userId, step, 'NIL', timezone);
  } else if (action === 'next') {
    const currentIndex = STANDUP_STEPS.indexOf(state.currentStep);
    if (currentIndex < STANDUP_STEPS.length - 1) {
      const nextStep = STANDUP_STEPS[currentIndex + 1];
      await standupStateManager.goToStep(userId, nextStep);
      return renderStep(nextStep, state.answers as StandupAnswers, timezone);
    }
  } else if (action === 'back') {
    const currentIndex = STANDUP_STEPS.indexOf(state.currentStep);
    if (currentIndex > 0) {
      const prevStep = STANDUP_STEPS[currentIndex - 1];
      await standupStateManager.goToStep(userId, prevStep);
      return renderStep(prevStep, state.answers as StandupAnswers, timezone);
    }
  } else if (action === 'submit') {
    await standupStateManager.submit(userId);
    return {
      content: '✅ Thank you! Your standup has been submitted.',
    };
  } else if (action === 'quickdate') {
    await standupStateManager.updateAnswer(userId, step, value, timezone);
    // Auto-advance to next step after quick date selection
    const currentIndex = STANDUP_STEPS.indexOf(state.currentStep);
    if (currentIndex < STANDUP_STEPS.length - 1) {
      const nextStep = STANDUP_STEPS[currentIndex + 1];
      await standupStateManager.goToStep(userId, nextStep);
      return renderStep(nextStep, state.answers as StandupAnswers, timezone);
    }
  }

  // Re-render current step
  return renderStep(state.currentStep, state.answers as StandupAnswers, timezone);
}

/**
 * Render a standup step
 */
function renderStep(
  step: StandupStep,
  answers: StandupAnswers,
  _timezone: string,
): { content: string; components?: any[] } {
  if (step === 'confirm') {
    return renderConfirmation(answers);
  }

  const config = STEP_CONFIG[step];
  const stepIndex = STANDUP_STEPS.indexOf(step);
  const totalSteps = STANDUP_STEPS.length;
  const currentAnswer = answers[step];

  let content = `**Step ${stepIndex + 1}/${totalSteps}: ${config.title}**\n\n`;

  // Show current answer if exists
  if (config.isList && Array.isArray(currentAnswer) && currentAnswer.length > 0) {
    content += '**Your answers:**\n' + currentAnswer.map((a) => `• ${a}`).join('\n') + '\n\n';
  } else if (!config.isList && !config.isDate && !config.isSelect && currentAnswer) {
    content += `**Your answer:** ${currentAnswer}\n\n`;
  } else if (config.isDate && currentAnswer && (currentAnswer as any).raw) {
    const parsed = currentAnswer as { raw: string; iso: string | null };
    content += `**Your answer:** ${parsed.raw || 'Nil'}\n\n`;
  } else if (config.isSelect && currentAnswer) {
    content += `**Your answer:** ${currentAnswer}\n\n`;
  }

  content += 'Please enter your response below:';

  const components: any[] = [];

  if (config.isList) {
    // Add "Nil" button for list fields
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`standup_nil_${step}`)
          .setLabel('Mark as Nil')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  }

  if (config.isDate) {
    // Quick date buttons
    const dateButtons = QUICK_DATE_OPTIONS.map((date) =>
      new ButtonBuilder()
        .setCustomId(`standup_quickdate_${step}_${date}`)
        .setLabel(date)
        .setStyle(ButtonStyle.Primary),
    );

    // Split into rows of 4 (max buttons per row)
    for (let i = 0; i < dateButtons.length; i += 4) {
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(dateButtons.slice(i, i + 4)),
      );
    }
  }

  if (config.isSelect && config.options) {
    const selectButtons = config.options.map((opt) =>
      new ButtonBuilder()
        .setCustomId(`standup_answer_${step}_${opt}`)
        .setLabel(opt)
        .setStyle(ButtonStyle.Primary),
    );

    for (let i = 0; i < selectButtons.length; i += 4) {
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(selectButtons.slice(i, i + 4)),
      );
    }
  }

  // Navigation buttons
  const navRow = new ActionRowBuilder<ButtonBuilder>();

  if (stepIndex > 0) {
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`standup_back_${step}`)
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary),
    );
  }

  navRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`standup_next_${step}`)
      .setLabel(stepIndex === totalSteps - 2 ? 'Review →' : 'Next →')
      .setStyle(ButtonStyle.Primary),
  );

  components.push(navRow);

  return { content, components };
}

/**
 * Render confirmation step
 */
function renderConfirmation(answers: StandupAnswers): { content: string; components?: any[] } {
  let content = '**Please review your standup:**\n\n';

  const sections: Array<{ title: string; value: any }> = [
    { title: 'What are you working on?', value: answers.what_working_on },
    { title: "Appetite", value: answers.appetite },
    { title: 'Start date', value: answers.start_date },
    { title: 'Scheduled completion', value: answers.scheduled_done_date },
    { title: 'Actual completion', value: answers.actual_done_date },
    { title: 'Progress today', value: answers.progress_today },
    { title: 'Expectations', value: answers.expectations },
    { title: 'At risk', value: answers.at_risk },
    { title: 'Decisions needed', value: answers.decisions },
    { title: 'Going well', value: answers.going_well },
    { title: 'Going poorly', value: answers.going_poorly },
    { title: 'Notes', value: answers.notes },
  ];

  for (const section of sections) {
    if (!section.value) continue;

    content += `**${section.title}:**\n`;

    if (Array.isArray(section.value)) {
      if (section.value.length === 0) {
        content += '_Nil_\n';
      } else {
        content += section.value.map((v) => `• ${v}`).join('\n') + '\n';
      }
    } else if (typeof section.value === 'object' && section.value !== null) {
      const dateValue = section.value as { raw: string; iso: string | null };
      content += dateValue.raw || '_Nil_\n';
    } else if (typeof section.value === 'string') {
      content += section.value || '_Nil_\n';
    }

    content += '\n';
  }

  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('standup_back_confirm')
        .setLabel('← Edit')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('standup_submit_confirm')
        .setLabel('✓ Submit Standup')
        .setStyle(ButtonStyle.Success),
    ),
  ];

  return { content, components };
}
