import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

// ───────── #3 Batch operations ─────────
describe('TasksModule - batch operations (#3)', () => {
  it('createMany() should POST add array to /api/v2/batch/task', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.createMany([{ title: 'A' }, { title: 'B' }]);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/task');
    expect(body.add).toHaveLength(2);
    expect(body.add[0].title).toBe('A');
    expect(body.add[0].id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('updateMany() should POST update array to /api/v2/batch/task', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.updateMany([{ id: 't1', projectId: 'p1', title: 'Updated' }]);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe('t1');
  });

  it('deleteMany() should POST delete array to /api/v2/batch/task', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.deleteMany([{ taskId: 't1', projectId: 'p1' }]);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.delete).toHaveLength(1);
    expect(body.delete[0].taskId).toBe('t1');
    expect(body.delete[0].projectId).toBe('p1');
  });
});

// ───────── #4 Move between projects ─────────
describe('TasksModule - move (#4)', () => {
  it('move() should POST to /api/v2/batch/taskProject', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.move({ taskId: 't1', fromProjectId: 'p1', toProjectId: 'p2' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/taskProject');
    expect(body.moveProject).toHaveLength(1);
    expect(body.moveProject[0]).toEqual({ taskId: 't1', fromProjectId: 'p1', toProjectId: 'p2' });
  });

  it('moveMany() should include all items in moveProject array', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.moveMany([
      { taskId: 't1', fromProjectId: 'p1', toProjectId: 'p2' },
      { taskId: 't2', fromProjectId: 'p1', toProjectId: 'p3' },
    ]);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.moveProject).toHaveLength(2);
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
  it('pin() should send pinnedTime as ISO string', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    const date = new Date('2026-04-07T00:00:00Z');
    await client.tasks.pin('t1', 'p1', date);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update[0].id).toBe('t1');
    expect(body.update[0].pinnedTime).toBeDefined();
  });

  it('pin() without date should use current time', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.pin('t1', 'p1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update[0].pinnedTime).toBeDefined();
  });

  it('unpin() should send pinnedTime as null', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.unpin('t1', 'p1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update[0].id).toBe('t1');
    expect(body.update[0].pinnedTime).toBeNull();
  });
});

// ───────── #8 Trash ─────────
describe('TasksModule - trash (#8)', () => {
  it('listTrash() should GET /api/v2/project/all/trash', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: { tasks: [], next: 0 } }]);
    await client.tasks.listTrash();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/project/all/trash');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('listTrash() with limit should include limit in URL', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: { tasks: [], next: 0 } }]);
    await client.tasks.listTrash({ limit: 20 });
    expect(mockFetch.calls[0]![0]).toContain('limit=20');
  });

  it('restore() should POST to /api/v2/batch/task', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tasks.restore('t1', 'p1');
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/task');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update[0].id).toBe('t1');
    expect(body.update[0].projectId).toBe('p1');
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
