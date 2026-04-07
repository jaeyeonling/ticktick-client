import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

// ───────── #3 Batch operations ─────────
describe('TasksModule - batch operations (#3)', () => {
  it('createMany() should POST each task individually to /api/v2/task', async () => {
    const { client, mockFetch } = createClient([
      { status: 200, body: {} },
      { status: 200, body: {} },
    ]);
    await client.tasks.createMany([{ title: 'A' }, { title: 'B' }]);
    expect(mockFetch.calls).toHaveLength(2);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/task');
    const body0 = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body0.title).toBe('A');
    expect(body0.id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('updateMany() should POST each task individually to /api/v2/task/{id}', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.updateMany([{ id: 't1', projectId: 'p1', title: 'Updated' }]);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/t1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.id).toBe('t1');
  });

  it('deleteMany() should POST status:-1 to each /api/v2/task/{id}', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.deleteMany([{ taskId: 't1', projectId: 'p1' }]);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/t1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.id).toBe('t1');
    expect(body.projectId).toBe('p1');
    expect(body.status).toBe(-1);
  });
});

// ───────── #4 Move between projects ─────────
// NOTE: TickTick REST API does not support in-place projectId mutation.
// move() is implemented as: list() → create in dst → delete from src.
describe('TasksModule - move (#4)', () => {
  it('move() should list, create in dst, then delete from src', async () => {
    const existingTask = { id: 't1', projectId: 'p1', title: 'Task 1', status: 0 };
    const newTask = { id: 'new-id', projectId: 'p2', title: 'Task 1', status: 0 };
    const { client, mockFetch } = createClient([
      { status: 200, body: { syncTaskBean: { update: [existingTask] } } }, // list()
      { status: 200, body: newTask },                                       // create in dst
      { status: 200, body: {} },                                           // delete from src
    ]);
    const result = await client.tasks.move({ taskId: 't1', fromProjectId: 'p1', toProjectId: 'p2' });

    // Step 1: list via batch/check
    expect(mockFetch.calls[0]![0]).toContain('/api/v3/batch/check/0');

    // Step 2: create in dst with new id and toProjectId
    expect(mockFetch.calls[1]![0]).toContain('/api/v2/task');
    const createBody = JSON.parse(mockFetch.calls[1]![1]?.body as string);
    expect(createBody.projectId).toBe('p2');
    expect(createBody.id).not.toBe('t1');
    expect(createBody.id).toMatch(/^[0-9a-f]{24}$/);

    // Step 3: delete old task from src
    expect(mockFetch.calls[2]![0]).toContain('/api/v2/task/t1');
    const deleteBody = JSON.parse(mockFetch.calls[2]![1]?.body as string);
    expect(deleteBody.status).toBe(-1);
    expect(deleteBody.projectId).toBe('p1');

    expect(result).toEqual({ task: newTask, previousId: 't1' });
  });

  it('move() should throw if task not found in list', async () => {
    const { client } = createClient([
      { status: 200, body: { syncTaskBean: { update: [] } } },
    ]);
    await expect(client.tasks.move({ taskId: 'missing', fromProjectId: 'p1', toProjectId: 'p2' }))
      .rejects.toThrow('Task missing not found');
  });

  it('moveMany() should use single list() then copy+delete each task', async () => {
    const task1 = { id: 't1', projectId: 'p1', title: 'T1', status: 0 };
    const task2 = { id: 't2', projectId: 'p1', title: 'T2', status: 0 };
    const { client, mockFetch } = createClient([
      // shared list() call
      { status: 200, body: { syncTaskBean: { update: [task1, task2] } } },
      // t1 create + t2 create (parallel — order may vary)
      { status: 200, body: { id: 'new1', projectId: 'p2', title: 'T1', status: 0 } },
      { status: 200, body: { id: 'new2', projectId: 'p3', title: 'T2', status: 0 } },
      // t1 delete + t2 delete (parallel — order may vary)
      { status: 200, body: {} },
      { status: 200, body: {} },
    ]);
    const results = await client.tasks.moveMany([
      { taskId: 't1', fromProjectId: 'p1', toProjectId: 'p2' },
      { taskId: 't2', fromProjectId: 'p1', toProjectId: 'p3' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]!.previousId).toBe('t1');
    expect(results[1]!.previousId).toBe('t2');
    // 1 list + 2 create + 2 delete = 5 calls total
    expect(mockFetch.calls).toHaveLength(5);
    expect(mockFetch.calls[0]![0]).toContain('/api/v3/batch/check/0');

    const bodies = mockFetch.calls.slice(1).map(c => JSON.parse(c[1]?.body as string));
    // both creates: new IDs with toProjectId
    const creates = bodies.filter(b => b.id !== 't1' && b.id !== 't2');
    expect(creates.some(b => b.projectId === 'p2')).toBe(true);
    expect(creates.some(b => b.projectId === 'p3')).toBe(true);
    // both deletes: original IDs with status -1
    const deletes = bodies.filter(b => b.status === -1);
    expect(deletes.some(b => b.id === 't1')).toBe(true);
    expect(deletes.some(b => b.id === 't2')).toBe(true);
  });
});

// ───────── #5 Subtask support ─────────
describe('TasksModule - subtasks (#5)', () => {
  it('createSubtask() should POST parent task with items array', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.createSubtask('parentId', 'projId', { title: 'Subtask A' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe('Subtask A');
    expect(body.items[0].id).toMatch(/^[0-9a-f]{24}$/);
    expect(body.id).toBe('parentId');
    expect(body.projectId).toBe('projId');
  });
});

// ───────── #6 RRULE recurrence ─────────
describe('TasksModule - recurrence (#6)', () => {
  it('create() should include repeatFlag in request body', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: { id: 't1', projectId: 'p1', title: 'Daily', status: 0 } }]);
    await client.tasks.create({
      title: 'Daily standup',
      repeatFlag: 'RRULE:FREQ=DAILY;INTERVAL=1',
    });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.repeatFlag).toBe('RRULE:FREQ=DAILY;INTERVAL=1');
  });

  it('create() should include repeatEndDate in request body', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: { id: 't1', projectId: 'p1', title: 'Weekly', status: 0 } }]);
    await client.tasks.create({
      title: 'Weekly review',
      repeatFlag: 'RRULE:FREQ=WEEKLY',
      repeatEndDate: '2026-12-31',
    });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.repeatEndDate).toBe('2026-12-31');
  });
});

// ───────── #7 Pin / Unpin ─────────
describe('TasksModule - pin/unpin (#7)', () => {
  it('pin() should POST to /api/v2/task/{id} with pinnedTime', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    const date = new Date('2026-04-07T00:00:00Z');
    await client.tasks.pin('t1', 'p1', date);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/t1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.id).toBe('t1');
    expect(body.pinnedTime).toBeDefined();
  });

  it('pin() without date should use current time', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.pin('t1', 'p1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.pinnedTime).toBeDefined();
  });

  it('unpin() should POST to /api/v2/task/{id} with pinnedTime null', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.unpin('t1', 'p1');
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/t1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.id).toBe('t1');
    expect(body.pinnedTime).toBeNull();
  });
});

// ───────── #8 Trash ─────────
describe('TasksModule - trash (#8)', () => {
  it('listTrash() should GET /api/v2/project/{id}/tasks with status=-1', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: [] }]);
    await client.tasks.listTrash({ projectId: 'p1' });
    const url = mockFetch.calls[0]![0]!;
    expect(url).toContain('/api/v2/project/p1/tasks');
    expect(url).toContain('status=-1');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('listTrash() with limit should include limit in URL', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: [] }]);
    await client.tasks.listTrash({ projectId: 'p1', limit: 20 });
    expect(mockFetch.calls[0]![0]).toContain('limit=20');
  });

  it('restore() should POST to /api/v2/task/{id} with status 0', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.restore('t1', 'p1');
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/t1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.id).toBe('t1');
    expect(body.projectId).toBe('p1');
    expect(body.status).toBe(0);
  });
});

// ───────── #9 Async iterator ─────────
describe('TasksModule - iterateCompleted (#9)', () => {
  it('should yield pages of tasks', async () => {
    const task = { id: 't1', projectId: 'p1', title: 'Done', status: 2 };
    const { client } = createClient([
      { status: 200, body: [task] },
      { status: 200, body: [] },
    ]);
    const pages: unknown[][] = [];
    for await (const page of client.tasks.iterateCompleted()) {
      pages.push([...page]);
    }
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(1);
  });

  it('should stop immediately on empty first response', async () => {
    const { client } = createClient([{ status: 200, body: [] }]);
    const pages: unknown[][] = [];
    for await (const page of client.tasks.iterateCompleted()) {
      pages.push([...page]);
    }
    expect(pages).toHaveLength(0);
  });
});
