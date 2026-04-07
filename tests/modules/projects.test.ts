import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';
import type { TickTickProject } from '../../src/types.js';

const mockProject: TickTickProject = {
  id: 'proj123',
  name: 'Test Project',
  color: '#ff0000',
  kind: 'TASK',
};

describe('ProjectsModule', () => {
  describe('list()', () => {
    it('should GET /api/v2/projects', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: [mockProject] }]);
      await client.projects.list();
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/projects');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
    });

    it('should return list of projects', async () => {
      const { client } = createClient([{ status: 200, body: [mockProject] }]);
      const projects = await client.projects.list();
      expect(projects).toHaveLength(1);
      expect(projects[0]?.name).toBe('Test Project');
    });

    it('should return empty array when no projects', async () => {
      const { client } = createClient([{ status: 200, body: [] }]);
      expect(await client.projects.list()).toEqual([]);
    });
  });
});
