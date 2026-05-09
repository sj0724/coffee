import { create } from 'zustand';
import { RecipeStep } from '../types';

interface TimerState {
  steps: RecipeStep[];
  currentStepIndex: number;
  timeLeft: number;
  isRunning: boolean;
  isDone: boolean;

  initTimer: (steps: RecipeStep[]) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  tick: () => void;
  nextStep: () => void;
  reset: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  steps: [],
  currentStepIndex: 0,
  timeLeft: 0,
  isRunning: false,
  isDone: false,

  initTimer: (steps) => {
    const first = steps[0];
    set({
      steps,
      currentStepIndex: 0,
      timeLeft: first?.duration ?? 0,
      isRunning: false,
      isDone: false,
    });
  },

  startTimer: () => set({ isRunning: true }),
  pauseTimer: () => set({ isRunning: false }),

  tick: () => {
    const { timeLeft, currentStepIndex, steps, isRunning } = get();
    if (!isRunning) return;

    const currentStep = steps[currentStepIndex];
    // 현재 단계에 duration이 없으면 tick 무시 (수동 진행)
    if (currentStep?.duration == null) return;

    if (timeLeft > 1) {
      set({ timeLeft: timeLeft - 1 });
    } else {
      get().nextStep();
    }
  },

  nextStep: () => {
    const { currentStepIndex, steps } = get();
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      set({ isRunning: false, isDone: true, timeLeft: 0 });
    } else {
      const nextStep = steps[nextIndex];
      set({
        currentStepIndex: nextIndex,
        timeLeft: nextStep.duration ?? 0,
        isRunning: true,
      });
    }
  },

  reset: () => {
    const { steps } = get();
    set({
      currentStepIndex: 0,
      timeLeft: steps[0]?.duration ?? 0,
      isRunning: false,
      isDone: false,
    });
  },
}));
