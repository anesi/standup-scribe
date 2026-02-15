import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from 'discord.js';
import { prisma } from '../lib/prisma';
import { standupStateManager } from '../services/standup-state';
import { STEP_CONFIG, STANDUP_STEPS, StandupStep } from '../utils/constants';

// Return type for interaction handlers
type InteractionResult =
  | { content: string; components?: any[] }
  | { modal: any };

/**
 * Handle standup button interactions - now opens modals
 */
export async function handleStandupInteraction(
  customId: string,
  userId: string,
  _user: User,
): Promise<InteractionResult> {
  // Format: standup:start:rosterMemberId:runId or standup:continue:step:rosterMemberId:runId
  const parts = customId.split(':');
  if (parts.length < 4 || parts[0] !== 'standup') {
    return { content: 'Invalid button format' };
  }

  const action = parts[1]; // 'start' or 'continue'
  let rosterMemberId: string;
  let runId: string;

  if (action === 'start') {
    rosterMemberId = parts[2];
    runId = parts[3];
  } else if (action === 'continue') {
    // standup:continue:step:rosterMemberId:runId
    rosterMemberId = parts[3];
    runId = parts[4];
  } else {
    return {
      content: 'Invalid action.',
    };
  }

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
    where: { guildId: run.guildId },
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
    (state.answers as any) = {
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

  // Open modal for current step
  return openModalForStep(state.currentStep, state.answers as any, rosterMemberId, runId);
}

/**
 * Handle modal submission
 * Returns a button to continue to the next modal (since Discord doesn't allow modal from modal submit)
 */
export async function handleModalSubmit(
  customId: string,
  userId: string,
  formData: { [key: string]: string },
): Promise<InteractionResult | null> {
  // Format: standup:modal:step:rosterMemberId:runId
  const parts = customId.split(':');
  if (parts.length < 5 || parts[0] !== 'standup' || parts[1] !== 'modal') {
    return { content: 'Invalid modal format' };
  }
  const step = parts[2] as StandupStep;
  const rosterMemberId = parts[3];
  const runId = parts[4];

  const state = await standupStateManager.getUserState(userId);

  if (!state) {
    return {
      content: 'Session expired. Please start a new standup.',
    };
  }

  // Get timezone for date parsing
  const config = await prisma.workspaceConfig.findFirst({
    where: { rosterMembers: { some: { userId } } },
  });

  const timezone = config?.timezone ?? 'utc';

  // Get the value from the form
  const value = formData.value || '';

  // Save the answer
  await standupStateManager.updateAnswer(userId, step, value, timezone);

  // Move to next step
  const currentIndex = STANDUP_STEPS.indexOf(state.currentStep);
  if (currentIndex < STANDUP_STEPS.length - 1) {
    const nextStep = STANDUP_STEPS[currentIndex + 1];
    await standupStateManager.goToStep(userId, nextStep);

    // If next step is confirm, show confirmation
    if (nextStep === 'confirm') {
      return renderConfirmation(state.answers as any, rosterMemberId, runId);
    }

    // Return a "Continue" button that will open the next modal
    const nextConfig = STEP_CONFIG[nextStep];
    const nextStepIndex = STANDUP_STEPS.indexOf(nextStep);

    return {
      content: `✅ Answer saved!\n\nNext: **${nextConfig.title}** (${nextStepIndex + 1}/${STANDUP_STEPS.length})`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`standup:continue:${nextStep}:${rosterMemberId}:${runId}`)
            .setLabel('Continue →')
            .setStyle(ButtonStyle.Primary),
        ),
      ],
    };
  }

  // All steps complete, show confirmation
  return renderConfirmation(state.answers as any, rosterMemberId, runId);
}

/**
 * Open a modal for the given step
 */
function openModalForStep(
  step: StandupStep,
  answers: any,
  rosterMemberId: string,
  runId: string,
): InteractionResult {
  const config = STEP_CONFIG[step];
  const stepIndex = STANDUP_STEPS.indexOf(step);
  const currentAnswer = answers[step];

  const modal = new ModalBuilder()
    .setCustomId(`standup:modal:${step}:${rosterMemberId}:${runId}`)
    .setTitle(`${stepIndex + 1}/${STANDUP_STEPS.length}: ${config.title}`);

  // Add appropriate input field based on step type
  if (config.isList) {
    const currentValue = Array.isArray(currentAnswer) ? currentAnswer.join('\n') : '';
    modal.addComponents(
      new ActionRowBuilder<any>().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel(config.title)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Enter each item on a new line (or type "Nil")')
          .setRequired(false)
          .setValue(currentValue),
      ),
    );
  } else if (config.isDate) {
    const parsed = (currentAnswer as any) as { raw: string; iso: string | null } | undefined;
    const currentValue = parsed?.raw || '';
    modal.addComponents(
      new ActionRowBuilder<any>().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel(config.title)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g., 15/02/2026, or "next Tuesday", or "Nil"')
          .setRequired(false)
          .setValue(currentValue),
      ),
    );
  } else if (config.isSelect) {
    modal.addComponents(
      new ActionRowBuilder<any>().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel(config.title)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(config.options?.join(' or ') || 'Select an option')
          .setRequired(false)
          .setValue((currentAnswer as string) || ''),
      ),
    );
  } else {
    // Free text field
    modal.addComponents(
      new ActionRowBuilder<any>().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel(config.title)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setValue((currentAnswer as string) || ''),
      ),
    );
  }

  return { modal };
}

/**
 * Handle answer submission for a step (for buttons like Nil, Back, Submit)
 */
export async function handleStandupAnswer(
  customId: string,
  userId: string,
  _value: string,
): Promise<InteractionResult | null> {
  // Format: standup:action:step:rosterMemberId:runId or standup:submit:confirm
  const parts = customId.split(':');

  let action: string;
  let step: StandupStep = 'what_working_on';

  if (parts[0] === 'standup') {
    if (parts[1] === 'nil') {
      action = 'nil';
      step = parts[2] as StandupStep;
    } else if (parts[1] === 'next') {
      action = 'next';
      step = parts[2] as StandupStep;
    } else if (parts[1] === 'back') {
      action = 'back';
      step = parts[2] === 'confirm' ? 'confirm' : (parts[2] as StandupStep);
    } else if (parts[1] === 'submit') {
      action = 'submit';
    } else {
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

  // Handle different actions
  if (action === 'nil') {
    await standupStateManager.updateAnswer(userId, step, 'NIL', timezone);
    // Move to next step
    const currentIndex = STANDUP_STEPS.indexOf(state.currentStep);
    if (currentIndex < STANDUP_STEPS.length - 1) {
      const nextStep = STANDUP_STEPS[currentIndex + 1];
      await standupStateManager.goToStep(userId, nextStep);
      return openModalForStep(nextStep, state.answers as any, state.rosterMemberId, state.runId);
    }
  } else if (action === 'next') {
    const currentIndex = STANDUP_STEPS.indexOf(state.currentStep);
    if (currentIndex < STANDUP_STEPS.length - 1) {
      const nextStep = STANDUP_STEPS[currentIndex + 1];
      await standupStateManager.goToStep(userId, nextStep);
      return openModalForStep(nextStep, state.answers as any, state.rosterMemberId, state.runId);
    }
  } else if (action === 'back') {
    const currentIndex = STANDUP_STEPS.indexOf(state.currentStep);
    if (currentIndex > 0) {
      const prevStep = STANDUP_STEPS[currentIndex - 1];
      await standupStateManager.goToStep(userId, prevStep);
      return openModalForStep(prevStep, state.answers as any, state.rosterMemberId, state.runId);
    } else {
      // Can't go back from first step
      return openModalForStep(state.currentStep, state.answers as any, state.rosterMemberId, state.runId);
    }
  } else if (action === 'submit') {
    await standupStateManager.submit(userId);
    return {
      content: '✅ Thank you! Your standup has been submitted.',
    };
  }

  return null;
}

/**
 * Render confirmation step
 */
function renderConfirmation(
  answers: any,
  rosterMemberId: string,
  runId: string,
): InteractionResult {
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
        .setCustomId(`standup:back:confirm:${rosterMemberId}:${runId}`)
        .setLabel('← Edit')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('standup:submit:confirm')
        .setLabel('✓ Submit Standup')
        .setStyle(ButtonStyle.Success),
    ),
  ];

  return { content, components };
}

/**
 * Get current answers for display
 */
export function getAnswersDisplay(userId: string): any {
  const state = standupStateManager.getAnswers(userId);
  return state;
}
