import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

const mockProfile = {
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  userId: 'user123',
  inboxId: 'inbox123',
  pro: false,
};

describe('UserModule', () => {
  describe('getProfile()', () => {
    it('should GET /api/v2/user/profile', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: mockProfile }]);
      await client.user.getProfile();
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/user/profile');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
    });

    it('should return typed profile object', async () => {
      const { client } = createClient([{ status: 200, body: mockProfile }]);
      const profile = await client.user.getProfile();
      expect(profile.username).toBe('testuser');
      expect(profile.email).toBe('test@example.com');
      expect(profile.pro).toBe(false);
    });

    it('should handle optional fields', async () => {
      const minimal = { userId: 'user123' };
      const { client } = createClient([{ status: 200, body: minimal }]);
      const profile = await client.user.getProfile();
      expect(profile.userId).toBe('user123');
      expect(profile.email).toBeUndefined();
    });
  });
});
