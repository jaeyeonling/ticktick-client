import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

// ───────── #15 Habits CRUD ─────────
describe('HabitsModule - CRUD (#15)', () => {
  const draft = {
    name: 'Exercise',
    repeatRule: 'RRULE:FREQ=DAILY',
    goal: 1,
    step: 1,
    unit: 'times',
    type: 'boolean',
    recordEnable: false,
  };

  it('create() should POST add array to /api/v2/batch/habit', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.habits.create(draft);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/batch/habit');
    expect(body.add).toHaveLength(1);
    expect(body.add[0].name).toBe('Exercise');
    expect(body.add[0].id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('update() should POST update array to /api/v2/batch/habit', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.habits.update({ id: 'habit123', name: 'Exercise daily' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe('habit123');
    expect(body.update[0].name).toBe('Exercise daily');
  });

  it('delete() should POST delete array with habit id', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.habits.delete('habit123');
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.delete).toEqual(['habit123']);
  });

  it('deleteMany() should POST delete array with multiple ids', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.habits.deleteMany(['h1', 'h2']);
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body.delete).toEqual(['h1', 'h2']);
  });
});

// ───────── #16 Upsert checkin ─────────
describe('HabitsModule - upsertCheckin (#16)', () => {
  it('should create new checkin when none exists for that date', async () => {
    const { client, mockFetch } = createClient([
      { status: 200, body: { habitCheckins: [] } }, // getCheckins → empty
      { status: 200, body: {} },                    // upsert → add
    ]);
    await client.habits.upsertCheckin({ habitId: 'h1', date: 20260407, value: 1, goal: 1 });
    const body = JSON.parse(mockFetch.calls[1]![1]?.body as string);
    expect(body.add).toHaveLength(1);
    expect(body.add[0].habitId).toBe('h1');
    expect(body.add[0].checkinStamp).toBe(20260407);
  });

  it('should update existing checkin when one exists for that date', async () => {
    const existing = { id: 'chk1', habitId: 'h1', checkinStamp: 20260407, goal: 1, value: 0, status: 1 };
    const { client, mockFetch } = createClient([
      { status: 200, body: { habitCheckins: [existing] } }, // getCheckins → found
      { status: 200, body: {} },                             // upsert → update
    ]);
    await client.habits.upsertCheckin({ habitId: 'h1', date: 20260407, value: 1, goal: 1 });
    const body = JSON.parse(mockFetch.calls[1]![1]?.body as string);
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe('chk1');
    expect(body.update[0].value).toBe(1);
  });

  it('should convert Date object to YYYYMMDD stamp', async () => {
    const { client, mockFetch } = createClient([
      { status: 200, body: { habitCheckins: [] } },
      { status: 200, body: {} },
    ]);
    await client.habits.upsertCheckin({ habitId: 'h1', date: new Date('2026-04-07'), value: 1, goal: 1 });
    const body = JSON.parse(mockFetch.calls[1]![1]?.body as string);
    expect(body.add[0].checkinStamp).toBe(20260407);
  });
});

// ───────── #17 Weekly stats ─────────
describe('HabitsModule - getWeekStats (#17)', () => {
  it('should GET /api/v2/habitCheckins/statistics', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.habits.getWeekStats();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/habitCheckins/statistics');
    expect(mockFetch.calls[0]![1]?.method).toBe('GET');
  });

  it('should return stats keyed by habitId', async () => {
    const stats = { habit123: { totalHabitCount: 7, completedHabitCount: 5 } };
    const { client } = createClient([{ status: 200, body: stats }]);
    const result = await client.habits.getWeekStats();
    expect(result['habit123']?.completedHabitCount).toBe(5);
  });
});
