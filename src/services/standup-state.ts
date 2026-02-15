import { prisma } from '../lib/prisma';
import { StandupStep, STEP_CONFIG } from '../utils/constants';
import { parseDate } from './date-parser';

export interface StandupAnswers {
  what_working_on: string[];
  appetite: string;
  start_date: { raw: string; iso: string | null };
  scheduled_done_date: { raw: string; iso: string | null };
  actual_done_date: { raw: string; iso: string | null };
  progress_today: string[];
  expectations: string;
  at_risk: string[];
  decisions: string[];
  going_well: string[];
  going_poorly: string[];
  notes: string;
}

export interface UserState {
  currentStep: StandupStep;
  answers: Partial<Omit<StandupAnswers, 'confirm'>>; // Remove 'confirm' from answers
  rosterMemberId: string;
  runId: string;
}

const DEFAULT_ANSWERS: StandupAnswers = {
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

export class StandupStateManager {
  private userStates = new Map<string, UserState>();

  async getUserState(userId: string): Promise<UserState | undefined> {
    // Check in-memory cache first
    const cached = this.userStates.get(userId);
    if (cached) {
      return cached;
    }

    // Try to load from database
    const response = await prisma.standupResponse.findFirst({
      where: {
        rosterMember: { userId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        run: { status: 'OPEN' },
      },
      include: {
        rosterMember: true,
        run: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!response || !response.answers) {
      return undefined;
    }

    const state: UserState = {
      currentStep: (response.answers as any).currentStep || 'what_working_on',
      answers: {
        ...DEFAULT_ANSWERS,
        ...(response.answers as any).answers,
      },
      rosterMemberId: response.rosterMemberId,
      runId: response.runId,
    };

    this.userStates.set(userId, state);
    return state;
  }

  async createOrUpdateState(
    userId: string,
    rosterMemberId: string,
    runId: string,
  ): Promise<UserState> {
    let state = this.userStates.get(userId);

    if (!state) {
      // Try to load existing
      state = await this.getUserState(userId);
    }

    if (!state) {
      // Create new state
      state = {
        currentStep: 'what_working_on',
        answers: { ...DEFAULT_ANSWERS },
        rosterMemberId,
        runId,
      };
    }

    this.userStates.set(userId, state);
    await this.saveState(userId, state);

    return state;
  }

  async saveState(_userId: string, state: UserState): Promise<void> {
    const { rosterMemberId, runId, currentStep, answers } = state;

    await prisma.standupResponse.upsert({
      where: {
        runId_rosterMemberId: {
          runId,
          rosterMemberId,
        },
      },
      create: {
        runId,
        rosterMemberId,
        status: 'IN_PROGRESS',
        answers: {
          currentStep,
          answers,
        },
      },
      update: {
        status: 'IN_PROGRESS',
        answers: {
          currentStep,
          answers,
        },
      },
    });
  }

  async updateAnswer(
    userId: string,
    step: StandupStep,
    value: any,
    timezone: string = 'utc',
  ): Promise<void> {
    const state = this.userStates.get(userId);
    if (!state) {
      throw new Error('No active standup state for user');
    }

    const config = STEP_CONFIG[step];

    // Skip if trying to update 'confirm' step (it's not in answers)
    if (step === 'confirm') {
      return;
    }

    if (config.isDate) {
      (state.answers as any)[step] = parseDate(value, timezone);
    } else if (config.isList) {
      if (value === 'NIL') {
        (state.answers as any)[step] = ['Nil'];
      } else if (Array.isArray(value)) {
        (state.answers as any)[step] = value;
      } else {
        // For single item, replace or append
        const current = (state.answers as any)[step] as string[];
        const idx = current.indexOf(value);
        if (idx >= 0) {
          (state.answers as any)[step] = current.filter((_, i) => i !== idx);
        } else {
          (state.answers as any)[step] = [...current, value];
        }
      }
    } else {
      (state.answers as any)[step] = value;
    }

    await this.saveState(userId, state);
  }

  async goToStep(userId: string, step: StandupStep): Promise<void> {
    const state = this.userStates.get(userId);
    if (!state) {
      throw new Error('No active standup state for user');
    }

    state.currentStep = step;
    await this.saveState(userId, state);
  }

  async submit(userId: string): Promise<void> {
    const state = this.userStates.get(userId);
    if (!state) {
      throw new Error('No active standup state for user');
    }

    const { rosterMemberId, runId, answers } = state;

    await prisma.standupResponse.update({
      where: {
        runId_rosterMemberId: {
          runId,
          rosterMemberId,
        },
      },
      data: {
        status: 'SUBMITTED',
        answers: answers as any,
        submittedAt: new Date(),
      },
    });

    this.userStates.delete(userId);
  }

  async clearState(userId: string): Promise<void> {
    this.userStates.delete(userId);
  }

  getCurrentStep(userId: string): StandupStep | null {
    const state = this.userStates.get(userId);
    return state?.currentStep ?? null;
  }

  getAnswers(userId: string): Partial<Omit<StandupAnswers, 'confirm'>> | undefined {
    const state = this.userStates.get(userId);
    return state?.answers;
  }
}

export const standupStateManager = new StandupStateManager();
