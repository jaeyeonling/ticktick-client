import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

const mockRanking = { ranking: 1, taskCount: 500, projectCount: 10, dayCount: 30, completedCount: 300, score: 1200, level: 5 };
const mockTask = { id: 't1', projectId: 'p1', title: 'Done task', status: 2 };

describe('StatisticsModule - real endpoints (#23-#24)', () => {
  it('getRanking() should GET /api/v2/user/ranking', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: mockRanking }]);
    await client.statistics.getRanking();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/user/ranking');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('getRanking() should return ranking data', async () => {
    const { client } = createClient([{ status: 200, body: mockRanking }]);
    const result = await client.statistics.getRanking();
    expect(result.completedCount).toBe(300);
    expect(result.level).toBe(5);
  });

  it('listCompleted() should GET /api/v2/project/all/completed/', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: [mockTask] }]);
    await client.statistics.listCompleted('2026-01-01 00:00:00', '2026-04-07 00:00:00');
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/project/all/completed/');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('listCompleted() should return tasks', async () => {
    const { client } = createClient([{ status: 200, body: [mockTask] }]);
    const result = await client.statistics.listCompleted('2026-01-01 00:00:00', '2026-04-07 00:00:00');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Done task');
  });
});
