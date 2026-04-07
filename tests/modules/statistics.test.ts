import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';
import type { TickTickSummary } from '../../src/types.js';

const mockSummary: TickTickSummary = {
  score: 1200,
  level: 5,
  todayCompleted: 3,
  totalCompleted: 150,
  todayPomoCount: 2,
  totalPomoCount: 80,
};

describe('StatisticsModule', () => {
  describe('getSummary()', () => {
    it('should GET /api/v2/user/statistics', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: mockSummary }]);
      await client.statistics.getSummary();
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/user/statistics');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
    });

    it('should return summary data', async () => {
      const { client } = createClient([{ status: 200, body: mockSummary }]);
      const summary = await client.statistics.getSummary();
      expect(summary.score).toBe(1200);
      expect(summary.level).toBe(5);
      expect(summary.todayCompleted).toBe(3);
    });
  });
});
