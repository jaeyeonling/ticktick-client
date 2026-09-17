import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type {
  TickTickProject,
  TickTickProjectDraft,
  TickTickColumn,
  TickTickProjectMember,
} from '../types.js';

/**
 * Raw response shape for `GET /api/v2/column?from=0`. That path is a bulk
 * column-sync endpoint and returns `{update: TickTickColumn[]}`, not a
 * bare array. The per-project path returns a bare array.
 */
type RawColumnsResponse = {
  readonly update?: readonly TickTickColumn[];
};

function unwrapColumns(raw: unknown): readonly TickTickColumn[] {
  if (Array.isArray(raw)) return raw as readonly TickTickColumn[];
  return (raw as RawColumnsResponse).update ?? [];
}

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

  /**
   * List kanban columns.
   *
   * - `listColumns(projectId)` → `GET /api/v2/column/project/{projectId}`
   *   (bare array of that project's columns).
   * - `listColumns()` → `GET /api/v2/column?from=0` (bulk sync; response is
   *   `{update: [...]}` and is unwrapped here).
   *
   * `?projectId=` on the bulk endpoint is not part of the API contract and
   * is not sent. The previous client-side filter was compensating for that
   * misunderstanding, not a server-side ignore.
   */
  async listColumns(projectId?: string): Promise<readonly TickTickColumn[]> {
    if (projectId) {
      return unwrapColumns(
        await this.client.request<unknown>(
          'GET',
          `/api/v2/column/project/${encodeURIComponent(projectId)}`,
        ),
      );
    }
    return unwrapColumns(
      await this.client.request<unknown>('GET', '/api/v2/column?from=0'),
    );
  }

  /**
   * List members of a shared project.
   *
   * Hits `GET /api/v2/project/{projectId}/users`. Returns an empty array
   * for unshared (personal) projects — the endpoint only populates once
   * the project has been explicitly shared with another TickTick account.
   *
   * Use the returned `userId` values with `TickTickTaskDraft.assignee`
   * to assign tasks to specific members.
   *
   * Discovered via live traffic probe in April 2026.
   */
  async listMembers(projectId: string): Promise<readonly TickTickProjectMember[]> {
    return this.client.request<readonly TickTickProjectMember[]>(
      'GET',
      `/api/v2/project/${projectId}/users`,
    );
  }
}
