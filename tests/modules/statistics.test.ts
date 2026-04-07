import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

const mockRanking = { ranking: 1, taskCount: 500, projectCount: 10, dayCount: 30, completedCount: 150, score: 1200, level: 5 };

describe('StatisticsModule', () => {
  it('getRanking() should GET /api/v2/user/ranking', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: mockRanking }]);
    await client.statistics.getRanking();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/user/ranking');
  });

  it('getRanking() should return ranking data', async () => {
    const { client } = createClient([{ status: 200, body: mockRanking }]);
    const result = await client.statistics.getRanking();
    expect(result.score).toBe(1200);
    expect(result.level).toBe(5);
  });
});
