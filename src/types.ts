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

// ───────── Tag ─────────

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

// ───────── Statistics ─────────

export type TickTickSummary = {
  readonly score: number;
  readonly level: number;
  readonly todayCompleted: number;
  readonly totalCompleted: number;
  readonly todayPomoCount: number;
  readonly totalPomoCount: number;
};
