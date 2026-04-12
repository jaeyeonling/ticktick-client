import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';
import type { TickTickProjectMember, TickTickColumn } from '../../src/types.js';

const mockMember: TickTickProjectMember = {
  userId: 115368611,
  displayName: 'Matthew',
  username: 'matthew@example.com',
  avatarUrl: 'https://example.com/a.png',
  isOwner: true,
  permission: 'write',
  acceptStatus: 1,
};

const mockInvitedMember: TickTickProjectMember = {
  userId: 125524115,
  displayName: 'Cris',
  username: 'cris@example.com',
  isOwner: false,
  permission: 'write',
  acceptStatus: 1,
};

describe('ProjectsModule.listMembers()', () => {
  it('should GET /api/v2/project/{id}/users', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: [mockMember] }]);
    await client.projects.listMembers('proj123');
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/project/proj123/users');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('should return members array for a shared project', async () => {
    const { client } = createClient([{ status: 200, body: [mockMember, mockInvitedMember] }]);
    const members = await client.projects.listMembers('proj123');
    expect(members).toHaveLength(2);
    expect(members[0]?.userId).toBe(115368611);
    expect(members[0]?.isOwner).toBe(true);
    expect(members[1]?.userId).toBe(125524115);
    expect(members[1]?.isOwner).toBe(false);
  });

  it('should return empty array for unshared (solo) projects', async () => {
    const { client } = createClient([{ status: 200, body: [] }]);
    const members = await client.projects.listMembers('soloproj');
    expect(members).toEqual([]);
  });
});

describe('ProjectsModule.listColumns() — response shape fix', () => {
  const col1: TickTickColumn = {
    id: 'col1',
    projectId: 'projA',
    name: 'Supermarket',
    sortOrder: -6597069766656,
  };
  const col2: TickTickColumn = {
    id: 'col2',
    projectId: 'projB',
    name: 'Pharmacy',
    sortOrder: -5772436045824,
  };

  it('should unwrap the {update: [...]} envelope the API actually returns', async () => {
    const { client } = createClient([
      { status: 200, body: { update: [col1, col2] } },
    ]);
    const columns = await client.projects.listColumns();
    expect(columns).toHaveLength(2);
    expect(columns[0]?.id).toBe('col1');
  });

  it('should still handle a bare array response for forward compatibility', async () => {
    const { client } = createClient([{ status: 200, body: [col1, col2] }]);
    const columns = await client.projects.listColumns();
    expect(columns).toHaveLength(2);
  });

  it('should client-side filter by projectId when requested (server-side filter is ignored)', async () => {
    const { client } = createClient([
      { status: 200, body: { update: [col1, col2] } },
    ]);
    const columns = await client.projects.listColumns('projA');
    expect(columns).toHaveLength(1);
    expect(columns[0]?.id).toBe('col1');
  });

  it('should return empty array when the wrapper is empty', async () => {
    const { client } = createClient([{ status: 200, body: { update: [] } }]);
    expect(await client.projects.listColumns()).toEqual([]);
  });

  it('should handle a wrapper with missing update field', async () => {
    const { client } = createClient([{ status: 200, body: {} }]);
    expect(await client.projects.listColumns()).toEqual([]);
  });
});
