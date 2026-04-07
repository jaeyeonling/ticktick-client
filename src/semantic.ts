import type { TickTickTaskPriority, TickTickTaskStatus } from './types.js';

// ───────── Task Priority ─────────

const TASK_PRIORITY_MAP: Record<string, TickTickTaskPriority> = {
  none: 0,
  low: 1,
  medium: 3,
  high: 5,
};

const TASK_PRIORITY_LABELS: Record<TickTickTaskPriority, string> = {
  0: 'none',
  1: 'low',
  3: 'medium',
  5: 'high',
};

const VALID_TASK_PRIORITIES = new Set<number>([0, 1, 3, 5]);

export function parseTaskPriority(
  input: string | TickTickTaskPriority,
): TickTickTaskPriority | undefined {
  if (typeof input === 'string') return TASK_PRIORITY_MAP[input];
  return VALID_TASK_PRIORITIES.has(input) ? input : undefined;
}

export function formatTaskPriority(priority: TickTickTaskPriority): string {
  return TASK_PRIORITY_LABELS[priority];
}

// ───────── Task Status ─────────

const TASK_STATUS_MAP: Record<string, TickTickTaskStatus> = {
  open: 0,
  completed: 2,
  abandoned: -1,
  "won't do": -1,
};

const TASK_STATUS_LABELS: Record<TickTickTaskStatus, string> = {
  0: 'open',
  2: 'completed',
  [-1]: 'abandoned',
};

const VALID_TASK_STATUSES = new Set<number>([0, 2, -1]);

export function parseTaskStatus(
  input: string | TickTickTaskStatus,
): TickTickTaskStatus | undefined {
  if (typeof input === 'string') return TASK_STATUS_MAP[input];
  return VALID_TASK_STATUSES.has(input) ? input : undefined;
}

export function formatTaskStatus(status: TickTickTaskStatus): string {
  return TASK_STATUS_LABELS[status];
}

// ───────── Habit Status ─────────

const HABIT_STATUS_MAP: Record<string, 0 | 1> = {
  normal: 0,
  archived: 1,
};

const HABIT_STATUS_LABELS: Record<0 | 1, string> = {
  0: 'normal',
  1: 'archived',
};

const VALID_HABIT_STATUSES = new Set<number>([0, 1]);

export function parseHabitStatus(input: string | 0 | 1): 0 | 1 | undefined {
  if (typeof input === 'string') return HABIT_STATUS_MAP[input];
  return VALID_HABIT_STATUSES.has(input) ? input : undefined;
}

export function formatHabitStatus(status: 0 | 1): string {
  return HABIT_STATUS_LABELS[status];
}

// ───────── Habit Checkin Status ─────────

const CHECKIN_STATUS_MAP: Record<string, 0 | 1 | 2> = {
  unlabeled: 0,
  undone: 1,
  done: 2,
};

const CHECKIN_STATUS_LABELS: Record<0 | 1 | 2, string> = {
  0: 'unlabeled',
  1: 'undone',
  2: 'done',
};

const VALID_CHECKIN_STATUSES = new Set<number>([0, 1, 2]);

export function parseCheckinStatus(input: string | 0 | 1 | 2): 0 | 1 | 2 | undefined {
  if (typeof input === 'string') return CHECKIN_STATUS_MAP[input];
  return VALID_CHECKIN_STATUSES.has(input) ? input : undefined;
}

export function formatCheckinStatus(status: 0 | 1 | 2): string {
  return CHECKIN_STATUS_LABELS[status];
}
