import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

// ───────── #23 User ranking ─────────
describe('StatisticsModule - getRanking (#23)', () => {
  it('should GET /api/v2/statistics/ranking', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.statistics.getRanking();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/statistics/ranking');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('should return typed ranking object', async () => {
    const ranking = { ranking: 42, taskCount: 300, projectCount: 10, dayCount: 90, completedCount: 280, score: 5000, level: 8 };
    const { client } = createClient([{ status: 200, body: ranking }]);
    const result = await client.statistics.getRanking();
    expect(result.ranking).toBe(42);
    expect(result.level).toBe(8);
  });
});

// ───────── #24 Task stats by date range ─────────
describe('StatisticsModule - getTaskStats (#24)', () => {
  it('should GET /api/v2/statistics/tasks with date params', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: [] }]);
    await client.statistics.getTaskStats('2026-01-01', '2026-03-31');
    const url = mockFetch.calls[0]![0]!;
    expect(url).toContain('/api/v2/statistics/tasks');
    expect(url).toContain('startDate=2026-01-01');
    expect(url).toContain('endDate=2026-03-31');
  });

  it('should return array of daily stats', async () => {
    const day = { day: '2026-01-01', completedCount: 5, overdueCompleteCount: 1, onTimeCompleteCount: 4, pomoCount: 3, pomoDuration: 75 };
    const { client } = createClient([{ status: 200, body: [day] }]);
    const stats = await client.statistics.getTaskStats('2026-01-01', '2026-01-01');
    expect(stats).toHaveLength(1);
    expect(stats[0]?.completedCount).toBe(5);
  });
});
