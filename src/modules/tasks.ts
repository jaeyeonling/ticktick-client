import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type {
  TickTickTask,
  TickTickTaskDraft,
  TickTickTaskUpdate,
  TickTickTaskMove,
  TickTickTrashOptions,
  TickTickTrashResponse,
  TickTickCompletedTaskOptions,
} from '../types.js';

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

  // ───────── #3 Batch operations ─────────

  async createMany(drafts: readonly TickTickTaskDraft[]): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/task', {
      add: drafts.map((draft) => ({ id: generateObjectId(), ...draft })),
    });
  }

  async updateMany(params: readonly TickTickTaskUpdate[]): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/task', { update: params });
  }

  async deleteMany(items: readonly { taskId: string; projectId: string }[]): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/task', { delete: items });
  }

  // ───────── #4 Move between projects ─────────

  async move(item: TickTickTaskMove): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/taskProject', {
      add: [],
      update: [],
      delete: [],
      moveProject: [item],
    });
  }

  async moveMany(items: readonly TickTickTaskMove[]): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/taskProject', {
      add: [],
      update: [],
      delete: [],
      moveProject: items,
    });
  }

  // ───────── #5 Subtask support ─────────

  async createSubtask(
    parentTaskId: string,
    parentProjectId: string,
    draft: { title: string; sortOrder?: number },
  ): Promise<TickTickTask> {
    return this.client.request<TickTickTask>('POST', `/api/v2/task/${parentTaskId}`, {
      id: parentTaskId,
      projectId: parentProjectId,
      items: [{ id: generateObjectId(), title: draft.title, status: 0, sortOrder: draft.sortOrder ?? 0 }],
    });
  }

  // ───────── #7 Pin / Unpin ─────────

  async pin(taskId: string, projectId: string, date?: Date): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/task', {
      update: [{ id: taskId, projectId, pinnedTime: (date ?? new Date()).toISOString() }],
    });
  }

  async unpin(taskId: string, projectId: string): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/task', {
      update: [{ id: taskId, projectId, pinnedTime: null }],
    });
  }

  // ───────── #8 Trash ─────────

  async listTrash(options?: TickTickTrashOptions): Promise<TickTickTrashResponse> {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.type !== undefined) params.set('type', String(options.type));
    const query = params.toString();
    return this.client.request<TickTickTrashResponse>(
      'GET',
      `/api/v2/project/all/trash${query ? `?${query}` : ''}`,
    );
  }

  async restore(taskId: string, projectId: string): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/task', {
      update: [{ id: taskId, projectId }],
    });
  }

  // ───────── #9 Async iterator for completed tasks ─────────

  async *iterateCompleted(
    options?: TickTickCompletedTaskOptions,
  ): AsyncGenerator<readonly TickTickTask[]> {
    const params = new URLSearchParams({ from: '', status: options?.status ?? 'Completed' });
    if (options?.projectId) params.set('projectId', options.projectId);

    while (true) {
      const page = await this.client.request<readonly TickTickTask[]>(
        'GET',
        `/api/v2/project/all/closed?${params.toString()}`,
      );
      if (page.length === 0) break;
      yield page;
      const last = page[page.length - 1];
      params.set('from', last?.completedTime ?? '');
    }
  }
}
