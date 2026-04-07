import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type {
  TickTickHabit,
  TickTickHabitCheckin,
  TickTickHabitDraft,
  TickTickCheckinInput,
  TickTickHabitWeekStats,
} from '../types.js';

type HabitCheckinsResponse = {
  readonly habitCheckins?: readonly TickTickHabitCheckin[];
};

const STATUS_MAP = { done: 2, undone: 1, unlabeled: 0 } as const;

function toCheckinStamp(date: Date | number | string): number {
  if (typeof date === 'number') return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return Number(`${y}${m}${day}`);
}

export class HabitsModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickHabit[]> {
    return this.client.request<readonly TickTickHabit[]>('GET', '/api/v2/habits');
  }

  async getCheckins(
    habitIds: readonly string[],
    startDate: string,
    endDate: string,
  ): Promise<readonly TickTickHabitCheckin[]> {
    const response = await this.client.request<HabitCheckinsResponse>(
      'POST',
      '/api/v2/habitCheckins/query',
      { habitIds, startDate, endDate },
    );
    return response.habitCheckins ?? [];
  }

  // ───────── #15 CRUD ─────────

  async create(draft: TickTickHabitDraft): Promise<void> {
    await this.client.request('POST', '/api/v2/habits/batch', {
      add: [{ id: generateObjectId(), ...draft }],
      update: [],
      delete: [],
    });
  }

  async update(params: Partial<TickTickHabitDraft> & { id: string }): Promise<void> {
    await this.client.request('POST', '/api/v2/habits/batch', {
      add: [],
      update: [params],
      delete: [],
    });
  }

  async delete(habitId: string): Promise<void> {
    await this.client.request('POST', '/api/v2/habits/batch', {
      add: [],
      update: [],
      delete: [habitId],
    });
  }

  async deleteMany(habitIds: readonly string[]): Promise<void> {
    await this.client.request('POST', '/api/v2/habits/batch', {
      add: [],
      update: [],
      delete: habitIds,
    });
  }

  // ───────── #16 Upsert checkin ─────────

  async upsertCheckin(input: TickTickCheckinInput): Promise<void> {
    const stamp = toCheckinStamp(input.date);
    const statusValue = input.status ? STATUS_MAP[input.status] : 2;

    const startStr = String(stamp);
    const existing = await this.getCheckins(
      [input.habitId],
      `${startStr.slice(0, 4)}-${startStr.slice(4, 6)}-${startStr.slice(6, 8)}`,
      `${startStr.slice(0, 4)}-${startStr.slice(4, 6)}-${startStr.slice(6, 8)}`,
    );

    const found = existing.find((c) => c.checkinStamp === stamp && c.habitId === input.habitId);

    const checkin = {
      habitId: input.habitId,
      checkinStamp: stamp,
      checkinTime: new Date().toISOString(),
      goal: input.goal,
      value: input.value ?? input.goal,
      status: statusValue,
    };

    if (found) {
      await this.client.request('POST', '/api/v2/habitCheckins/batch', {
        update: [{ ...checkin, id: found.id }],
      });
    } else {
      await this.client.request('POST', '/api/v2/habitCheckins/batch', {
        add: [{ ...checkin, id: generateObjectId() }],
      });
    }
  }

  // ───────── #17 Weekly stats ─────────

  async getWeekStats(): Promise<TickTickHabitWeekStats> {
    return this.client.request<TickTickHabitWeekStats>('GET', '/api/v2/habitCheckins/statistics');
  }
}
