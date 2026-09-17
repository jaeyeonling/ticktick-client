import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';
import type { TickTickTask } from '../../src/types.js';

const mockTask: TickTickTask = {
  id: 'task123',
  projectId: 'proj123',
  title: 'Test Task',
  status: 0,
  priority: 0,
  dueDate: '2026-09-16T00:00:00.000+0000',
  startDate: '2026-09-16T00:00:00.000+0000',
  tags: ['work'],
  content: 'notes',
};

function parseBody(call: [string, RequestInit?] | undefined): Record<string, unknown> {
  return JSON.parse(call![1]?.body as string) as Record<string, unknown>;
}

describe('TasksModule', () => {
  describe('list()', () => {
    it('should return tasks array', async () => {
      const { client } = createClient([{ status: 200, body: { syncTaskBean: { update: [mockTask] } } }]);
      const tasks = await client.tasks.list();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.title).toBe('Test Task');
    });

    it('should return empty array if response is empty', async () => {
      const { client } = createClient([{ status: 200, body: { syncTaskBean: { update: [] } } }]);
      expect(await client.tasks.list()).toEqual([]);
    });

    it('should return empty array if syncTaskBean is missing', async () => {
      const { client } = createClient([{ status: 200, body: {} }]);
      expect(await client.tasks.list()).toEqual([]);
    });

    it('should call GET /api/v3/batch/check/0', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: { syncTaskBean: { update: [] } } }]);
      await client.tasks.list();
      expect(mockFetch.calls[0]![0]).toContain('/api/v3/batch/check/0');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
    });
  });

  describe('listCompleted()', () => {
    it('should call correct endpoint', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: [] }]);
      await client.tasks.listCompleted();
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/project/all/closed');
    });

    it('should include projectId and limit in query params', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: [] }]);
      await client.tasks.listCompleted({ projectId: 'proj1', limit: 10 });
      const url = mockFetch.calls[0]![0]!;
      expect(url).toContain('projectId=proj1');
      expect(url).toContain('limit=10');
    });

    it('should include status=Completed', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: [] }]);
      await client.tasks.listCompleted();
      expect(mockFetch.calls[0]![0]).toContain('status=Completed');
    });
  });

  describe('create()', () => {
    it('should POST to /api/v2/task', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: mockTask }]);
      await client.tasks.create({ title: 'New Task' });
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/task');
      expect(mockFetch.calls[0]![1]?.method).toBe('POST');
    });

    it('should include generated id in request body', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: mockTask }]);
      await client.tasks.create({ title: 'New Task', projectId: 'proj123' });
      const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
      expect(body.id).toMatch(/^[0-9a-f]{24}$/);
      expect(body.title).toBe('New Task');
      expect(body.projectId).toBe('proj123');
    });

    it('should return created task', async () => {
      const { client } = createClient([{ status: 200, body: mockTask }]);
      const task = await client.tasks.create({ title: 'New Task' });
      expect(task).toEqual(mockTask);
    });
  });

  describe('get()', () => {
    it('should GET /api/v2/task/{id}?projectId=', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: mockTask }]);
      const task = await client.tasks.get('task123', 'proj123');
      expect(task).toEqual(mockTask);
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/task123');
      expect(mockFetch.calls[0]![0]).toContain('projectId=proj123');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
    });
  });

  describe('update()', () => {
    it('should GET then POST the merged task to /api/v2/task/:id', async () => {
      const { client, mockFetch } = createClient([
        { status: 200, body: mockTask },
        { status: 200, body: { ...mockTask, title: 'Updated' } },
      ]);
      await client.tasks.update({ id: 'task123', projectId: 'proj123', title: 'Updated' });
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/task123');
      expect(mockFetch.calls[0]![0]).toContain('projectId=proj123');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
      expect(mockFetch.calls[1]![0]).toContain('/api/v2/task/task123');
      expect(mockFetch.calls[1]![1]?.method).toBe('POST');
    });

    it('should preserve omitted fields such as dueDate', async () => {
      const { client, mockFetch } = createClient([
        { status: 200, body: mockTask },
        { status: 200, body: mockTask },
      ]);
      await client.tasks.update({ id: 'task123', projectId: 'proj123', priority: 5 });
      const body = parseBody(mockFetch.calls[1]);
      expect(body.priority).toBe(5);
      expect(body.title).toBe('Test Task');
      expect(body.dueDate).toBe(mockTask.dueDate);
      expect(body.startDate).toBe(mockTask.startDate);
      expect(body.tags).toEqual(['work']);
      expect(body.content).toBe('notes');
    });

    it('should allow clearing a nullable field with null', async () => {
      const { client, mockFetch } = createClient([
        { status: 200, body: mockTask },
        { status: 200, body: mockTask },
      ]);
      await client.tasks.update({ id: 'task123', projectId: 'proj123', dueDate: null });
      const body = parseBody(mockFetch.calls[1]);
      expect(body.dueDate).toBeNull();
      expect(body.startDate).toBe(mockTask.startDate);
    });
  });

  describe('complete()', () => {
    it('should GET then POST status 2 merged onto the existing task', async () => {
      const { client, mockFetch } = createClient([
        { status: 200, body: mockTask },
        { status: 200, body: {} },
      ]);
      await client.tasks.complete('proj123', 'task123');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/task123');
      expect(mockFetch.calls[0]![0]).toContain('projectId=proj123');
      expect(mockFetch.calls[1]![0]).toContain('/api/v2/task/task123');
      const body = parseBody(mockFetch.calls[1]);
      expect(body.status).toBe(2);
      expect(body.id).toBe('task123');
      expect(body.projectId).toBe('proj123');
      expect(body.title).toBe('Test Task');
      expect(body.dueDate).toBe(mockTask.dueDate);
      expect(body.startDate).toBe(mockTask.startDate);
      expect(body.tags).toEqual(['work']);
      expect(body.content).toBe('notes');
    });

    it('should include completedTime in ISO format', async () => {
      const { client, mockFetch } = createClient([
        { status: 200, body: mockTask },
        { status: 200, body: {} },
      ]);
      await client.tasks.complete('proj123', 'task123');
      const body = parseBody(mockFetch.calls[1]);
      expect(body.completedTime).toBeDefined();
    });

    it('should not POST if the task cannot be fetched', async () => {
      const { client, mockFetch } = createClient([{ status: 404, body: { error: 'not found' } }]);
      await expect(client.tasks.complete('proj123', 'task123')).rejects.toThrow();
      expect(mockFetch.calls).toHaveLength(1);
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
    });
  });

  describe('delete()', () => {
    it('should POST to /api/v2/task/{id} with status -1', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
      await client.tasks.delete('proj123', 'task123');
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/task123');
      expect(mockFetch.calls[0]![1]?.method).toBe('POST');
      const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
      expect(body.id).toBe('task123');
      expect(body.projectId).toBe('proj123');
      expect(body.status).toBe(-1);
    });
  });
});
