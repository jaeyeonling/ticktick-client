import type { TickTickClient } from '../client.js';
import type { TickTickSummary } from '../types.js';

export class StatisticsModule {
  constructor(private readonly client: TickTickClient) {}

  async getSummary(): Promise<TickTickSummary> {
    return this.client.request<TickTickSummary>('GET', '/api/v2/user/statistics');
  }
}
