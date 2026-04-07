import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

// ───────── #10 Projects CRUD ─────────
describe('ProjectsModule - CRUD (#10)', () => {
  it('create() should POST add array to /api/v2/batch/project', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.projects.create({ name: 'Work', color: '#ff0000' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/project');
    expect(body.add).toHaveLength(1);
    expect(body.add[0].name).toBe('Work');
    expect(body.add[0].id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('create() should return created project', async () => {
    const mockProject = { id: 'proj123', name: 'Work', color: '#ff0000' };
    const { client } = createClient([{ status: 200, body: { id2etag: { proj123: 'etag1' } } }]);
    const result = await client.projects.create({ name: 'Work', color: '#ff0000' });
    expect(result.name).toBe('Work');
  });

  it('update() should POST update array to /api/v2/batch/project', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.projects.update({ id: 'proj123', name: 'Personal' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe('proj123');
    expect(body.update[0].name).toBe('Personal');
  });

  it('delete() should POST delete array with single id', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.projects.delete('proj123');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.delete).toEqual(['proj123']);
  });

  it('deleteMany() should POST delete array with multiple ids', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.projects.deleteMany(['proj1', 'proj2', 'proj3']);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.delete).toEqual(['proj1', 'proj2', 'proj3']);
  });
});

// ───────── #11 Kanban columns ─────────
describe('ProjectsModule - listColumns (#11)', () => {
  it('should GET /api/v2/column?from=0', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: [] }]);
    await client.projects.listColumns();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/column');
    expect(mockFetch.calls[0]![0]).toContain('from=0');
  });

  it('should return list of columns', async () => {
    const col = { id: 'col1', projectId: 'proj1', name: 'To Do' };
    const { client } = createClient([{ status: 200, body: [col] }]);
    const columns = await client.projects.listColumns();
    expect(columns).toHaveLength(1);
    expect(columns[0]?.name).toBe('To Do');
  });

  it('should filter by projectId when provided', async () => {
    const col = { id: 'col1', projectId: 'proj1', name: 'To Do' };
    const { client, mockFetch } = createClient([{ status: 200, body: [col] }]);
    await client.projects.listColumns('proj1');
    expect(mockFetch.calls[0]![0]).toContain('projectId=proj1');
  });
});
