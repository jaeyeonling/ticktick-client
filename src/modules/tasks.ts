import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type {
  TickTickTask,
  TickTickTaskDraft,
  TickTickTaskUpdate,
  TickTickTaskMove,
  TickTickMoveResult,
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
  //
  // Verified 2026-04-07 via Playwright traffic capture:
  // - POST /api/v3/batch/taskProject → 404 (endpoint does not exist)
  // - POST /api/v2/task/{id} with new projectId → 200 but projectId NOT changed
  // - Web app uses WebSocket for native moves (not available via REST API)
  //
  // Only viable approach: copy-to-destination + delete-from-source.
  // The returned task has a NEW id. Use result.previousId to track the mapping.

  /**
   * Move a task to a different project.
   *
   * **⚠️ ID changes:** The TickTick REST API does not support in-place project
   * moves. This method copies the task to the destination project and deletes
   * the original. The returned `TickTickMoveResult` contains both the new task
   * and the `previousId` for reference tracking.
   */
  async move(item: TickTickTaskMove): Promise<TickTickMoveResult> {
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
    return { task: newTask, previousId: item.taskId };
  }

  /**
   * Move multiple tasks to different projects.
   *
   * **⚠️ ID changes:** Same copy+delete limitation as {@link move}.
   * Returns an array of `TickTickMoveResult` with old-to-new ID mappings.
   */
  async moveMany(items: readonly TickTickTaskMove[]): Promise<readonly TickTickMoveResult[]> {
    const all = await this.list();
    return Promise.all(
      items.map(async (item): Promise<TickTickMoveResult> => {
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
        return { task: newTask, previousId: item.taskId };
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

  /**
   * Lists tasks in a project (intended for trash retrieval).
   *
   * **⚠️ Known limitation (confirmed 2026-04-07):** The `status=-1` query
   * parameter is **ignored** by the TickTick REST API. This endpoint returns
   * active tasks regardless of the status filter. Deleted tasks do not appear
   * in any known REST endpoint.
   *
   * - `GET /api/v2/project/{id}/tasks?status=-1` → returns active tasks (status=0)
   * - `GET /api/v2/trash/tasks` → 404 (does not exist)
   *
   * This method is kept for forward compatibility in case TickTick fixes the
   * endpoint, but callers should not rely on it returning deleted tasks.
   *
   * @see https://github.com/jaeyeonling/ticktick-client/issues/33
   */
  async listTrash(options: TickTickTrashOptions & { projectId: string }): Promise<readonly TickTickTask[]> {
    const params = new URLSearchParams({ status: '-1' });
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    return this.client.request<readonly TickTickTask[]>(
      'GET',
      `/api/v2/project/${options.projectId}/tasks?${params.toString()}`,
    );
  }

  /**
   * Restores a deleted task by setting its status back to 0 (open).
   *
   * **⚠️ Known limitation:** Since {@link listTrash} cannot reliably retrieve
   * deleted task IDs, this method requires you to know the task ID beforehand
   * (e.g., saved before deletion).
   */
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
