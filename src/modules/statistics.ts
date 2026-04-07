import type { TickTickClient } from '../client.js';
import type { TickTickSummary, TickTickRanking, TickTickDailyStat } from '../types.js';

export class StatisticsModule {
  constructor(private readonly client: TickTickClient) {}

  async getSummary(): Promise<TickTickSummary> {
    return this.client.request<TickTickSummary>('GET', '/api/v2/user/statistics');
  }

  async getRanking(): Promise<TickTickRanking> {
    return this.client.request<TickTickRanking>('GET', '/api/v2/statistics/ranking');
  }

  async getTaskStats(startDate: string, endDate: string): Promise<readonly TickTickDailyStat[]> {
    return this.client.request<readonly TickTickDailyStat[]>(
      'GET',
      `/api/v2/statistics/tasks?startDate=${startDate}&endDate=${endDate}`,
    );
  }
}
