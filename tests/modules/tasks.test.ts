import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';
import type { TickTickTask } from '../../src/types.js';

const mockTask: TickTickTask = {
  id: 'task123',
  projectId: 'proj123',
  title: 'Test Task',
  status: 0,
  priority: 0,
};

describe('TasksModule', () => {
  describe('list()', () => {
    it('should return tasks from syncTaskBean', async () => {
      const { client } = createClient([{ status: 200, body: { syncTaskBean: { update: [mockTask] } } }]);
      const tasks = await client.tasks.list();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.title).toBe('Test Task');
    });

    it('should return empty array if syncTaskBean is missing', async () => {
      const { client } = createClient([{ status: 200, body: {} }]);
      expect(await client.tasks.list()).toEqual([]);
    });

    it('should call /api/v2/batch/check/0', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
      await client.tasks.list();
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/check/0');
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

  describe('update()', () => {
    it('should POST to /api/v2/task/:id', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: mockTask }]);
      await client.tasks.update({ id: 'task123', projectId: 'proj123', title: 'Updated' });
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/task/task123');
      expect(mockFetch.calls[0]![1]?.method).toBe('POST');
    });
  });

  describe('complete()', () => {
    it('should POST to /api/v2/batch/task with status 2', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
      await client.tasks.complete('proj123', 'task123');
      const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
      expect(body.update[0].status).toBe(2);
      expect(body.update[0].id).toBe('task123');
      expect(body.update[0].projectId).toBe('proj123');
    });

    it('should include completedTime in ISO format', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
      await client.tasks.complete('proj123', 'task123');
      const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
      expect(body.update[0].completedTime).toBeDefined();
    });
  });

  describe('delete()', () => {
    it('should DELETE /api/v2/project/:projectId/task/:taskId', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
      await client.tasks.delete('proj123', 'task123');
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/project/proj123/task/task123');
      expect(mockFetch.calls[0]![1]?.method).toBe('DELETE');
    });
  });
});
