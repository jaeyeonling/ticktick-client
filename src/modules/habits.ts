import type { TickTickClient } from '../client.js';
import type { TickTickHabit, TickTickHabitCheckin } from '../types.js';

type HabitCheckinsResponse = {
  readonly habitCheckins?: readonly TickTickHabitCheckin[];
};

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
}
