// ───────── Session ─────────

export type TickTickSession = {
  readonly username: string;
  readonly token: string;
  readonly csrfToken?: string;
  readonly cookies: Record<string, string>;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// ───────── Task ─────────

export type TickTickTaskStatus = 0 | -1 | 2; // open=0, abandoned=-1, completed=2
export type TickTickTaskPriority = 0 | 1 | 3 | 5; // none=0, low=1, medium=3, high=5

export type TickTickTaskItem = {
  readonly id: string;
  readonly title: string;
  readonly status: 0 | 2;
  readonly completedTime?: string | null;
  readonly sortOrder?: number;
};

export type TickTickTask = {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: TickTickTaskStatus;
  readonly priority?: TickTickTaskPriority;
  readonly startDate?: string | null;
  readonly dueDate?: string | null;
  readonly completedTime?: string | null;
  readonly isAllDay?: boolean | null;
  readonly timeZone?: string;
  readonly content?: string | null;
  readonly tags?: readonly string[];
  readonly items?: readonly TickTickTaskItem[];
  readonly repeatFlag?: string | null;
  readonly columnId?: string | null;
  readonly sortOrder?: number;
  readonly pinnedTime?: string | null;
};

export type TickTickTaskDraft = {
  readonly title: string;
  readonly projectId?: string;
  readonly priority?: TickTickTaskPriority;
  readonly startDate?: string | null;
  readonly dueDate?: string | null;
  readonly isAllDay?: boolean;
  readonly content?: string;
  readonly tags?: readonly string[];
  readonly repeatFlag?: string | null;
  readonly repeatEndDate?: string | null;
};

export type TickTickTaskMove = {
  readonly taskId: string;
  readonly fromProjectId: string;
  readonly toProjectId: string;
};

export type TickTickTrashOptions = {
  readonly limit?: number;
  readonly type?: number;
};

export type TickTickTrashResponse = {
  readonly tasks: readonly TickTickTask[];
  readonly next: number;
};

export type TickTickCompletedTaskOptions = {
  readonly status?: 'Completed' | 'Abandoned';
  readonly projectId?: string;
};

export type TickTickTaskUpdate = TickTickTaskDraft & {
  readonly id: string;
  readonly projectId: string;
};

// ───────── Project ─────────

export type TickTickProject = {
  readonly id: string;
  readonly name: string;
  readonly color?: string;
  readonly kind?: string;
  readonly viewMode?: string;
  readonly permission?: string;
  readonly closed?: boolean | null;
  readonly sortOrder?: number;
};

export type TickTickProjectDraft = {
  readonly name: string;
  readonly color?: string;
  readonly kind?: 'TASK' | 'NOTE';
  readonly viewMode?: 'list' | 'kanban' | 'timeline';
};

export type TickTickColumn = {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly sortOrder?: number;
  readonly createdTime?: string;
  readonly modifiedTime?: string;
};

// ───────── Tag ─────────

export type TickTickTagDraft = {
  readonly name: string;
  readonly label?: string;
  readonly color?: string;
  readonly parent?: string | null;
  readonly sortOrder?: number;
};

export type TickTickTag = {
  readonly name: string;
  readonly label?: string;
  readonly color?: string;
  readonly parent?: string | null;
  readonly sortOrder?: number;
};

// ───────── Habit ─────────

export type TickTickHabit = {
  readonly id: string;
  readonly name: string;
  readonly status: 0 | 1; // normal=0, archived=1
  readonly repeatRule: string;
  readonly goal: number;
  readonly step: number;
  readonly unit: string;
  readonly type: string;
  readonly recordEnable: boolean;
  readonly currentStreak?: number;
  readonly totalCheckIns?: number;
  readonly sectionId?: string;
};

export type TickTickHabitCheckin = {
  readonly id?: string | null;
  readonly habitId: string;
  readonly checkinStamp: number; // YYYYMMDD format (e.g. 20260407)
  readonly checkinTime?: string | null;
  readonly goal: number;
  readonly value: number;
  readonly status: 0 | 1 | 2; // unlabeled=0, undone=1, done=2
};

// ───────── User ─────────

export type TickTickUserProfile = {
  readonly username?: string;
  readonly email?: string | null;
  readonly name?: string | null;
  readonly userId?: string;
  readonly inboxId?: string;
  readonly phone?: string | null;
  readonly picture?: string;
  readonly locale?: string;
  readonly pro?: boolean;
  readonly proEndDate?: string;
};

export type TickTickHabitDraft = {
  readonly name: string;
  readonly repeatRule: string;
  readonly goal: number;
  readonly step: number;
  readonly unit: string;
  readonly type: string;
  readonly recordEnable: boolean;
  readonly color?: string;
  readonly iconRes?: string;
  readonly sectionId?: string;
};

export type TickTickCheckinInput = {
  readonly habitId: string;
  readonly date: Date | number | string;
  readonly value?: number;
  readonly status?: 'done' | 'undone' | 'unlabeled';
  readonly goal: number;
};

export type TickTickHabitWeekStats = Record<string, {
  readonly totalHabitCount: number;
  readonly completedHabitCount: number;
}>;

// ───────── Focus ─────────

export type FocusStartOptions = {
  readonly duration?: number;
  readonly focusOnId?: string;
  readonly focusOnTitle?: string | null;
  readonly note?: string;
  readonly manual?: boolean;
};

export type FocusState = {
  readonly lastPoint: number;
  readonly focusId: string | null;
  readonly status: 'idle' | 'running' | 'paused' | null;
  readonly duration: number;
  readonly pomoCount: number;
  readonly focusOnId: string | null;
  readonly focusOnTitle: string | null;
};

// ───────── Statistics ─────────

export type TickTickRanking = {
  readonly ranking: number;
  readonly taskCount: number;
  readonly projectCount: number;
  readonly dayCount: number;
  readonly completedCount: number;
  readonly score: number;
  readonly level: number;
};

export type TickTickDailyStat = {
  readonly day: string;
  readonly completedCount: number;
  readonly overdueCompleteCount: number;
  readonly onTimeCompleteCount: number;
  readonly pomoCount: number;
  readonly pomoDuration: number;
};

export type TickTickCountdownType = 'countdown' | 'anniversary' | 'birthday' | 'holiday';

export type TickTickCountdownDraft = {
  readonly name: string;
  readonly date: Date | number | string;
  readonly type?: TickTickCountdownType;
  readonly color?: string;
  readonly ignoreYear?: boolean;
  readonly remark?: string;
};

export type TickTickCountdown = {
  readonly id: string;
  readonly name: string;
  readonly date: string;
  readonly type?: TickTickCountdownType;
  readonly color?: string;
  readonly ignoreYear?: boolean;
  readonly remark?: string;
};

export type TickTickSummary = {
  readonly score: number;
  readonly level: number;
  readonly todayCompleted: number;
  readonly totalCompleted: number;
  readonly todayPomoCount: number;
  readonly totalPomoCount: number;
};
