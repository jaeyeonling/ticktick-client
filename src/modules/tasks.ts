import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type {
  TickTickTask,
  TickTickTaskDraft,
  TickTickTaskUpdate,
  TickTickTaskMove,
  TickTickTrashOptions,
  TickTickCompletedTaskOptions,
} from '../types.js';

type BatchCheckResponse = {
  readonly syncTaskBean?: {
    readonly update?: readonly TickTickTask[];
  };
};

export class TasksModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickTask[]> {
    const response = await this.client.request<BatchCheckResponse>('GET', '/api/v3/batch/check/0');
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
    await this.client.request('POST', `/api/v2/task/${taskId}`, {
      id: taskId,
      projectId,
      status: 2,
      completedTime: new Date().toISOString().replace('Z', '+0000'),
    });
  }

  async delete(projectId: string, taskId: string): Promise<void> {
    await this.client.request('POST', `/api/v2/task/${taskId}`, { id: taskId, projectId, status: -1 });
  }

  // ───────── #3 Batch operations ─────────

  async createMany(drafts: readonly TickTickTaskDraft[]): Promise<void> {
    await Promise.all(
      drafts.map((draft) =>
        this.client.request('POST', '/api/v2/task', { id: generateObjectId(), ...draft }),
      ),
    );
  }

  async updateMany(params: readonly TickTickTaskUpdate[]): Promise<void> {
    await Promise.all(
      params.map((p) => this.client.request('POST', `/api/v2/task/${p.id}`, p)),
    );
  }

  async deleteMany(items: readonly { taskId: string; projectId: string }[]): Promise<void> {
    await Promise.all(
      items.map((item) =>
        this.client.request('POST', `/api/v2/task/${item.taskId}`, {
          id: item.taskId,
          projectId: item.projectId,
          status: -1,
        }),
      ),
    );
  }

  // ───────── #4 Move between projects ─────────
  // NOTE: TickTick REST API does not support in-place projectId mutation.
  // move() is implemented as copy-to-dst + delete-from-src.
  // The returned task will have a new server-assigned id.

  async move(item: TickTickTaskMove): Promise<TickTickTask> {
    const all = await this.list();
    const task = all.find((t) => t.id === item.taskId);
    if (!task) throw new Error(`Task ${item.taskId} not found`);

    const newTask = await this.client.request<TickTickTask>('POST', '/api/v2/task', {
      ...task,
      id: generateObjectId(),
      projectId: item.toProjectId,
    });
    await this.client.request('POST', `/api/v2/task/${item.taskId}`, {
      id: item.taskId,
      projectId: item.fromProjectId,
      status: -1,
    });
    return newTask;
  }

  async moveMany(items: readonly TickTickTaskMove[]): Promise<void> {
    const all = await this.list();
    await Promise.all(
      items.map(async (item) => {
        const task = all.find((t) => t.id === item.taskId);
        if (!task) throw new Error(`Task ${item.taskId} not found`);
        await this.client.request<TickTickTask>('POST', '/api/v2/task', {
          ...task,
          id: generateObjectId(),
          projectId: item.toProjectId,
        });
        await this.client.request('POST', `/api/v2/task/${item.taskId}`, {
          id: item.taskId,
          projectId: item.fromProjectId,
          status: -1,
        });
      }),
    );
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
    await this.client.request('POST', `/api/v2/task/${taskId}`, {
      id: taskId,
      projectId,
      pinnedTime: (date ?? new Date()).toISOString(),
    });
  }

  async unpin(taskId: string, projectId: string): Promise<void> {
    await this.client.request('POST', `/api/v2/task/${taskId}`, {
      id: taskId,
      projectId,
      pinnedTime: null,
    });
  }

  // ───────── #8 Trash ─────────

  async listTrash(options: TickTickTrashOptions & { projectId: string }): Promise<readonly TickTickTask[]> {
    const params = new URLSearchParams({ status: '-1' });
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    return this.client.request<readonly TickTickTask[]>(
      'GET',
      `/api/v2/project/${options.projectId}/tasks?${params.toString()}`,
    );
  }

  async restore(taskId: string, projectId: string): Promise<void> {
    await this.client.request('POST', `/api/v2/task/${taskId}`, { id: taskId, projectId, status: 0 });
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
      // Normalize cursor: "2026-04-02T22:42:07.000+0000" → "2026-04-02 22:42:07"
      const cursor = (last?.completedTime ?? '')
        .replace(/\.\d+\+\d+$/, '')   // strip .000+0000
        .replace(/\.\d+Z$/, '')        // strip .000Z
        .replace('T', ' ');
      params.set('from', cursor);
    }
  }
}
