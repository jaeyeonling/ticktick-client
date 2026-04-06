import type { TickTickClient } from '../client.js';

type FocusTimeline = {
  readonly id: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: number;
  readonly pauseDuration: number;
  readonly type: number;
};

type FocusOverview = {
  readonly todayPomoCount: number;
  readonly todayPomoDuration: number;
  readonly totalPomoCount: number;
  readonly totalPomoDuration: number;
};

export class FocusModule {
  constructor(private readonly client: TickTickClient) {}

  async getTimeline(
    startDate: string,
    endDate: string,
  ): Promise<readonly FocusTimeline[]> {
    return this.client.request<readonly FocusTimeline[]>(
      'GET',
      `/api/v2/pomodoros?startDate=${startDate}&endDate=${endDate}`,
    );
  }

  async getOverview(): Promise<FocusOverview> {
    return this.client.request<FocusOverview>('GET', '/api/v2/pomodoros/statistics');
  }
}
