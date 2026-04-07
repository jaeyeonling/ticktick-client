import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

const mockCountdown = { id: 'cd1', name: 'Project Launch', date: '2026-12-31', type: 'countdown' };

describe('CountdownsModule - CRUD (#25)', () => {
  it('list() should GET /api/v2/countdowns', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: [mockCountdown] }]);
    await client.countdowns.list();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/countdowns');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('list() should return countdowns', async () => {
    const { client } = createClient([{ status: 200, body: [mockCountdown] }]);
    const result = await client.countdowns.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Project Launch');
  });

  it('create() should POST add array to /api/v2/batch/countdown', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.countdowns.create({ name: 'Launch', date: new Date('2026-12-31') });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/countdown');
    expect(body.add).toHaveLength(1);
    expect(body.add[0].name).toBe('Launch');
    expect(body.add[0].id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('create() should convert Date to ISO string', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.countdowns.create({ name: 'Launch', date: new Date('2026-12-31T00:00:00Z') });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(typeof body.add[0].date).toBe('string');
  });

  it('update() should POST update array', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.countdowns.update({ id: 'cd1', name: 'New Name' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe('cd1');
  });

  it('delete() should POST delete array', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.countdowns.delete('cd1');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.delete).toEqual(['cd1']);
  });
});
