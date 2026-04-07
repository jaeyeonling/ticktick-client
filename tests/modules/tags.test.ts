import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';
import type { TickTickTag } from '../../src/types.js';

const mockTag: TickTickTag = {
  name: 'work',
  label: 'Work',
  color: '#0000ff',
};

describe('TagsModule', () => {
  describe('list()', () => {
    it('should return tags from syncTaskBean', async () => {
      const { client } = createClient([{ status: 200, body: { tags: [mockTag] } }]);
      const tags = await client.tags.list();
      expect(tags).toHaveLength(1);
      expect(tags[0]?.name).toBe('work');
    });

    it('should return empty array if tags missing', async () => {
      const { client } = createClient([{ status: 200, body: {} }]);
      expect(await client.tags.list()).toEqual([]);
    });

    it('should call /api/v2/batch/check/0', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
      await client.tags.list();
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/check/0');
    });
  });
});
