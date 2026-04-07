import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

// ───────── #12 Tags CRUD ─────────
describe('TagsModule - CRUD (#12)', () => {
  it('create() should POST add array to /api/v2/batch/tag', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tags.create({ name: 'work', color: '#ff0000' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/tag');
    expect(body.add).toHaveLength(1);
    expect(body.add[0].name).toBe('work');
    expect(body.add[0].color).toBe('#ff0000');
  });

  it('createMany() should POST all tags in add array', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tags.createMany([{ name: 'work' }, { name: 'personal' }]);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.add).toHaveLength(2);
    expect(body.add[0].name).toBe('work');
    expect(body.add[1].name).toBe('personal');
  });

  it('update() should POST update array to /api/v2/batch/tag', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tags.update({ name: 'work', color: '#00ff00' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update).toHaveLength(1);
    expect(body.update[0].name).toBe('work');
    expect(body.update[0].color).toBe('#00ff00');
  });

  it('delete() should POST delete array with tag name', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tags.delete('work');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.delete).toEqual(['work']);
  });

  it('deleteMany() should POST delete array with multiple names', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tags.deleteMany(['work', 'personal']);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.delete).toEqual(['work', 'personal']);
  });
});

// ───────── #13 Tags rename ─────────
describe('TagsModule - rename (#13)', () => {
  it('rename() should POST update with new label', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tags.rename('work', 'Work Projects');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/tag');
    expect(body.update).toHaveLength(1);
    expect(body.update[0].name).toBe('work');
    expect(body.update[0].label).toBe('Work Projects');
  });
});

// ───────── #14 Tags merge ─────────
describe('TagsModule - merge (#14)', () => {
  it('merge() should POST with merge payload', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.tags.merge('work-old', 'work');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/tag');
    expect(body.merge).toHaveLength(1);
    expect(body.merge[0].sourceTagName).toBe('work-old');
    expect(body.merge[0].targetTagName).toBe('work');
  });
});
