import type { TickTickClient } from '../client.js';
import type { TickTickTag, TickTickTagDraft } from '../types.js';

type SyncResponse = {
  readonly tags?: readonly TickTickTag[];
};

export class TagsModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickTag[]> {
    const response = await this.client.request<SyncResponse>('GET', '/api/v2/batch/check/0');
    return response.tags ?? [];
  }

  async create(draft: TickTickTagDraft): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/tag', { add: [draft] });
  }

  async createMany(drafts: readonly TickTickTagDraft[]): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/tag', { add: drafts });
  }

  async update(draft: TickTickTagDraft): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/tag', { update: [draft] });
  }

  async delete(name: string): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/tag', { delete: [name] });
  }

  async deleteMany(names: readonly string[]): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/tag', { delete: names });
  }

  async rename(name: string, label: string): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/tag', { update: [{ name, label }] });
  }

  async merge(sourceTagName: string, targetTagName: string): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/tag', {
      merge: [{ sourceTagName, targetTagName }],
    });
  }
}
