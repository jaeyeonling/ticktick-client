import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

describe('FocusModule', () => {
  describe('getTimeline()', () => {
    it('should GET /api/v2/pomodoros with ms timestamp params', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: [] }]);
      await client.focus.getTimeline('2026-04-01', '2026-04-07');
      const url = mockFetch.calls[0]![0]!;
      expect(url).toContain('/api/v2/pomodoros');
      expect(url).toContain('from=');
      expect(url).toContain('to=');
    });

    it('should return timeline entries', async () => {
      const entry = { id: 'p1', startTime: '2026-04-01T09:00:00Z', endTime: '2026-04-01T09:25:00Z', status: 2, pauseDuration: 0, type: 1 };
      const { client } = createClient([{ status: 200, body: [entry] }]);
      const timeline = await client.focus.getTimeline('2026-04-01', '2026-04-07');
      expect(timeline).toHaveLength(1);
      expect(timeline[0]?.id).toBe('p1');
    });
  });

  describe('getOverview()', () => {
    it('should GET /api/v2/pomodoros/statistics/generalForDesktop', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
      await client.focus.getOverview();
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/pomodoros/statistics/generalForDesktop');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
    });

    it('should return overview data', async () => {
      const overview = { todayPomoCount: 3, todayPomoDuration: 75, totalPomoCount: 100, totalPomoDuration: 2500 };
      const { client } = createClient([{ status: 200, body: overview }]);
      const result = await client.focus.getOverview();
      expect(result.todayPomoCount).toBe(3);
      expect(result.totalPomoCount).toBe(100);
    });
  });
});
