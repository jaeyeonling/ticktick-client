import type { TickTickClient } from '../client.js';
import type { TickTickTag } from '../types.js';

type SyncResponse = {
  readonly tags?: readonly TickTickTag[];
};

export class TagsModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickTag[]> {
    const response = await this.client.request<SyncResponse>('GET', '/api/v2/batch/check/0');
    return response.tags ?? [];
  }
}
