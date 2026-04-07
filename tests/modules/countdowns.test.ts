import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

const mockCountdown = { id: 'cd1', name: 'Project Launch', date: 20261231, type: 1 };

describe('CountdownsModule - CRUD (#25)', () => {
  it('list() should GET /api/v2/countdown/list', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: { countdowns: [mockCountdown] } }]);
    await client.countdowns.list();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/countdown/list');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('list() should return countdowns from response.countdowns', async () => {
    const { client } = createClient([{ status: 200, body: { countdowns: [mockCountdown] } }]);
    const result = await client.countdowns.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Project Launch');
  });

  it('create() should POST add array to /api/v2/countdown/batch', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.countdowns.create({ name: 'Launch', date: new Date('2026-12-31') });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/countdown/batch');
    expect(body.add).toHaveLength(1);
    expect(body.add[0].name).toBe('Launch');
    expect(body.add[0].id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('create() should convert Date to YYYYMMDD integer', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.countdowns.create({ name: 'Launch', date: new Date('2026-12-31T00:00:00Z') });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(typeof body.add[0].date).toBe('number');
    expect(body.add[0].date).toBe(20261231);
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
