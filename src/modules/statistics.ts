import type { TickTickClient } from '../client.js';
import type { TickTickRanking, TickTickTask } from '../types.js';

export class StatisticsModule {
  constructor(private readonly client: TickTickClient) {}

  async getRanking(): Promise<TickTickRanking> {
    return this.client.request<TickTickRanking>('GET', '/api/v2/user/ranking');
  }

  async listCompleted(
    from: string,
    to: string,
    limit = 100,
  ): Promise<readonly TickTickTask[]> {
    const fromEnc = encodeURIComponent(from);
    const toEnc = encodeURIComponent(to);
    return this.client.request<readonly TickTickTask[]>(
      'GET',
      `/api/v2/project/all/completed/?from=${fromEnc}&to=${toEnc}&limit=${limit}`,
    );
  }
}
