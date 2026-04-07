import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';
import type { TickTickHabit, TickTickHabitCheckin } from '../../src/types.js';

const mockHabit: TickTickHabit = {
  id: 'habit123',
  name: 'Exercise',
  status: 0,
  repeatRule: 'FREQ=DAILY',
  goal: 1,
  step: 1,
  unit: 'times',
  type: 'boolean',
  recordEnable: true,
};

const mockCheckin: TickTickHabitCheckin = {
  habitId: 'habit123',
  checkinStamp: 20260407,
  goal: 1,
  value: 1,
  status: 2,
};

describe('HabitsModule', () => {
  describe('list()', () => {
    it('should GET /api/v2/habits', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: [mockHabit] }]);
      await client.habits.list();
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/habits');
      expect(mockFetch.calls[0]![1]?.method).toBe('GET');
    });

    it('should return list of habits', async () => {
      const { client } = createClient([{ status: 200, body: [mockHabit] }]);
      const habits = await client.habits.list();
      expect(habits).toHaveLength(1);
      expect(habits[0]?.name).toBe('Exercise');
    });
  });

  describe('getCheckins()', () => {
    it('should POST to /api/v2/habitCheckins/query', async () => {
      const { client, mockFetch } = createClient([
        { status: 200, body: { habitCheckins: [mockCheckin] } },
      ]);
      await client.habits.getCheckins(['habit123'], '2026-04-01', '2026-04-07');
      expect(mockFetch.calls[0]![0]).toContain('/api/v2/habitCheckins/query');
      expect(mockFetch.calls[0]![1]?.method).toBe('POST');
    });

    it('should send habitIds, startDate, endDate in body', async () => {
      const { client, mockFetch } = createClient([{ status: 200, body: { habitCheckins: [] } }]);
      await client.habits.getCheckins(['habit123', 'habit456'], '2026-04-01', '2026-04-07');
      const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
      expect(body.habitIds).toEqual(['habit123', 'habit456']);
      expect(body.startDate).toBe('2026-04-01');
      expect(body.endDate).toBe('2026-04-07');
    });

    it('should return checkins from response', async () => {
      const { client } = createClient([{ status: 200, body: { habitCheckins: [mockCheckin] } }]);
      const checkins = await client.habits.getCheckins(['habit123'], '2026-04-01', '2026-04-07');
      expect(checkins).toHaveLength(1);
      expect(checkins[0]?.habitId).toBe('habit123');
    });

    it('should return empty array if habitCheckins missing', async () => {
      const { client } = createClient([{ status: 200, body: {} }]);
      const checkins = await client.habits.getCheckins([], '2026-04-01', '2026-04-07');
      expect(checkins).toEqual([]);
    });
  });
});
