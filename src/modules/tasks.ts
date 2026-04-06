import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type { TickTickTask, TickTickTaskDraft, TickTickTaskUpdate } from '../types.js';

type SyncResponse = {
  readonly syncTaskBean?: {
    readonly update?: readonly TickTickTask[];
  };
};

export class TasksModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickTask[]> {
    const response = await this.client.request<SyncResponse>('GET', '/api/v2/batch/check/0');
    return response.syncTaskBean?.update ?? [];
  }

  async listCompleted(options?: {
    projectId?: string;
    limit?: number;
  }): Promise<readonly TickTickTask[]> {
    const params = new URLSearchParams({ from: '', status: 'Completed' });
    if (options?.projectId) params.set('projectId', options.projectId);
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    return this.client.request<readonly TickTickTask[]>(
      'GET',
      `/api/v2/project/all/closed?${params.toString()}`,
    );
  }

  async create(draft: TickTickTaskDraft): Promise<TickTickTask> {
    return this.client.request<TickTickTask>('POST', '/api/v2/task', {
      id: generateObjectId(),
      ...draft,
    });
  }

  async update(params: TickTickTaskUpdate): Promise<TickTickTask> {
    return this.client.request<TickTickTask>('POST', `/api/v2/task/${params.id}`, params);
  }

  async complete(projectId: string, taskId: string): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/task', {
      update: [
        {
          id: taskId,
          projectId,
          status: 2,
          completedTime: new Date().toISOString().replace('Z', '+0000'),
        },
      ],
    });
  }

  async delete(projectId: string, taskId: string): Promise<void> {
    await this.client.request('DELETE', `/api/v2/project/${projectId}/task/${taskId}`);
  }
}
