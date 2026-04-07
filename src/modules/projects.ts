import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type { TickTickProject, TickTickProjectDraft, TickTickColumn } from '../types.js';

export class ProjectsModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickProject[]> {
    return this.client.request<readonly TickTickProject[]>('GET', '/api/v2/projects');
  }

  async create(draft: TickTickProjectDraft): Promise<TickTickProject> {
    const id = generateObjectId();
    await this.client.request('POST', '/api/v2/batch/project', {
      add: [{ id, ...draft }],
    });
    return { id, ...draft };
  }

  async update(params: TickTickProjectDraft & { id: string }): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/project', {
      update: [params],
    });
  }

  async delete(projectId: string): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/project', {
      delete: [projectId],
    });
  }

  async deleteMany(projectIds: readonly string[]): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/project', {
      delete: projectIds,
    });
  }

  async listColumns(projectId?: string): Promise<readonly TickTickColumn[]> {
    const params = new URLSearchParams({ from: '0' });
    if (projectId) params.set('projectId', projectId);
    return this.client.request<readonly TickTickColumn[]>(
      'GET',
      `/api/v2/column?${params.toString()}`,
    );
  }
}
