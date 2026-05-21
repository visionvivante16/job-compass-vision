// Custom event bus for widget communication (localStorage-backed)

const CHALLENGE_STORAGE_KEY = "jobpulse_daily_challenge";
const POMODORO_STORAGE_KEY = "jobpulse_pomodoro";
const BADGE_STORAGE_KEY = "jobpulse_badges";
const STREAK_STORAGE_KEY = "jobpulse_streak";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export interface ChallengeState {
  date: string; // YYYY-MM-DD
  progress: number;
  goal: number;
  completed: boolean;
  type: "apply" | "save" | "explore" | "profile";
}

export interface StreakState {
  currentStreak: number;
  lastCompletedDate: string; // YYYY-MM-DD
}

export interface BadgeState {
  totalCompletions: number;
  tier: BadgeTier;
  history: string[]; // dates completed
}

export interface PomodoroState {
  remainingSeconds: number;
  totalSeconds: number;
  isRunning: boolean;
  isBreak: boolean;
  sessionGoal: number;
  sessionApplied: number;
  sessionsToday: number;
  totalAppliedToday: number;
  date: string;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDayOfWeek(): number {
  return new Date().getDay(); // 0=Sun, 1=Mon, ...
}

export const DAILY_CHALLENGES = [
  { day: 0, text: "Update your profile & apply to 1 job", goal: 1, type: "apply" as const },
  { day: 1, text: "Apply to 2 remote jobs today", goal: 2, type: "apply" as const },
  { day: 2, text: "Apply to 3 jobs at funded startups", goal: 3, type: "apply" as const },
  { day: 3, text: "Save 5 jobs that match your skills", goal: 5, type: "save" as const },
  { day: 4, text: "Apply to 2 jobs with salary listed", goal: 2, type: "apply" as const },
  { day: 5, text: "Apply to 1 dream company today", goal: 1, type: "apply" as const },
  { day: 6, text: "Explore 3 new job categories", goal: 3, type: "explore" as const },
];

export function getTodayChallenge() {
  const dayOfWeek = getDayOfWeek();
  return DAILY_CHALLENGES[dayOfWeek];
}

export function loadChallengeState(): ChallengeState {
  try {
    const raw = localStorage.getItem(CHALLENGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChallengeState;
      if (parsed.date === getTodayStr()) return parsed;
    }
  } catch {}
  const challenge = getTodayChallenge();
  return {
    date: getTodayStr(),
    progress: 0,
    goal: challenge.goal,
    completed: false,
    type: challenge.type,
  };
}

export function saveChallengeState(state: ChallengeState) {
  localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(state));
}

export function loadStreakState(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StreakState;
  } catch {}
  return { currentStreak: 0, lastCompletedDate: "" };
}

export function saveStreakState(state: StreakState) {
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(state));
}

export function loadBadgeState(): BadgeState {
  try {
    const raw = localStorage.getItem(BADGE_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BadgeState;
  } catch {}
  return { totalCompletions: 0, tier: "bronze", history: [] };
}

export function saveBadgeState(state: BadgeState) {
  localStorage.setItem(BADGE_STORAGE_KEY, JSON.stringify(state));
}

export function getBadgeTier(completions: number): BadgeTier {
  if (completions >= 31) return "platinum";
  if (completions >= 16) return "gold";
  if (completions >= 6) return "silver";
  return "bronze";
}

export function loadPomodoroState(): PomodoroState {
  try {
    const raw = localStorage.getItem(POMODORO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PomodoroState;
      if (parsed.date === getTodayStr()) return parsed;
    }
  } catch {}
  return {
    remainingSeconds: 25 * 60,
    totalSeconds: 25 * 60,
    isRunning: false,
    isBreak: false,
    sessionGoal: 3,
    sessionApplied: 0,
    sessionsToday: 0,
    totalAppliedToday: 0,
    date: getTodayStr(),
  };
}

export function savePomodoroState(state: PomodoroState) {
  localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(state));
}

// Event bus for cross-widget communication
type WidgetEventType = "apply" | "save";
type WidgetListener = (type: WidgetEventType) => void;

const listeners: Set<WidgetListener> = new Set();

export function onWidgetEvent(listener: WidgetListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitWidgetEvent(type: WidgetEventType) {
  listeners.forEach((fn) => fn(type));
}
