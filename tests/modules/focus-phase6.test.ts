import { describe, it, expect } from 'vitest';
import { createClient } from '../helpers.js';

// ───────── #20 Focus session control ─────────
describe('FocusModule - session control (#20)', () => {
  it('start() should POST start op to /api/v2/pomodoros', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.start({ duration: 25, focusOnTitle: 'Write tests' });
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/pomodoros');
    expect(body[0].op).toBe('start');
    expect(body[0].duration).toBe(25);
    expect(body[0].focusOnTitle).toBe('Write tests');
  });

  it('start() should default duration to 25', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.start();
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body[0].duration).toBe(25);
  });

  it('pause() should POST pause op', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.pause();
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body[0].op).toBe('pause');
  });

  it('resume() should POST continue op', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.resume();
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body[0].op).toBe('continue');
  });

  it('finish() should POST finish op', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.finish();
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body[0].op).toBe('finish');
  });

  it('stop() should POST drop op', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.stop();
    const body = JSON.parse(mockFetch.calls[0]![1]?.body as string);
    expect(body[0].op).toBe('drop');
  });
});

// ───────── #21 Heatmap and distribution ─────────
describe('FocusModule - analytics (#21)', () => {
  it('getHeatmap() should GET /api/v2/pomodoros/heatmap with date params', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.getHeatmap('2026-01-01', '2026-03-31');
    const url = mockFetch.calls[0]![0]!;
    expect(url).toContain('/api/v2/pomodoros/heatmap');
    expect(url).toContain('startDate=2026-01-01');
    expect(url).toContain('endDate=2026-03-31');
  });

  it('getHourDistribution() should GET /api/v2/pomodoros/hour_distribution', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.getHourDistribution('2026-01-01', '2026-03-31');
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/pomodoros/hour_distribution');
  });

  it('getDistribution() should GET /api/v2/pomodoros/distribution', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: {} }]);
    await client.focus.getDistribution('2026-01-01', '2026-03-31');
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/pomodoros/distribution');
  });
});

// ───────── #22 Local state management ─────────
describe('FocusModule - local state (#22)', () => {
  it('getState() should return null status initially', () => {
    const { client } = createClient([]);
    const state = client.focus.getState();
    expect(state.status).toBeNull();
    expect(state.focusId).toBeNull();
  });

  it('resetState() should restore default values', async () => {
    const { client } = createClient([{ status: 200, body: {} }]);
    await client.focus.start({ duration: 30 });
    client.focus.resetState();
    const state = client.focus.getState();
    expect(state.status).toBeNull();
    expect(state.lastPoint).toBe(0);
  });

  it('syncState() should GET current state from server', async () => {
    const { client, mockFetch } = createClient([{ status: 200, body: { status: 'running' } }]);
    await client.focus.syncState();
    expect(mockFetch.calls[0]![0]).toContain('/api/v2/pomodoros/current');
  });
});
