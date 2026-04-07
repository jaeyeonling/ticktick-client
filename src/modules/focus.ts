import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type { FocusStartOptions, FocusState } from '../types.js';

type FocusTimeline = {
  readonly id: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: number;
  readonly pauseDuration: number;
  readonly type: number;
};

type FocusOverview = {
  readonly todayPomoCount: number;
  readonly todayPomoDuration: number;
  readonly totalPomoCount: number;
  readonly totalPomoDuration: number;
};

const DEFAULT_STATE: FocusState = {
  lastPoint: 0,
  focusId: null,
  status: null,
  duration: 25,
  pomoCount: 0,
  focusOnId: null,
  focusOnTitle: null,
};

function toMs(date: string): number {
  return new Date(date).getTime();
}

export class FocusModule {
  #state: FocusState = { ...DEFAULT_STATE };

  constructor(private readonly client: TickTickClient) {}

  // ───────── Existing ─────────

  // Params: date strings (YYYY-MM-DD). API expects ms timestamps.
  async getTimeline(startDate: string, endDate: string): Promise<readonly FocusTimeline[]> {
    return this.client.request<readonly FocusTimeline[]>(
      'GET',
      `/api/v2/pomodoros?from=${toMs(startDate)}&to=${toMs(endDate)}`,
    );
  }

  async getOverview(): Promise<FocusOverview> {
    return this.client.request<FocusOverview>('GET', '/api/v2/pomodoros/statistics/generalForDesktop');
  }

  // ───────── #20 Session control ─────────

  async start(options?: FocusStartOptions): Promise<void> {
    const id = generateObjectId();
    const duration = options?.duration ?? 25;
    await this.client.request('POST', '/api/v2/pomodoro', [
      {
        id,
        op: 'start',
        duration,
        lastPoint: this.#state.lastPoint,
        ...(options?.focusOnId && { focusOnId: options.focusOnId }),
        ...(options?.focusOnTitle !== undefined && { focusOnTitle: options.focusOnTitle }),
        ...(options?.note && { note: options.note }),
        ...(options?.manual !== undefined && { manual: options.manual }),
      },
    ]);
    this.#state = { ...this.#state, focusId: id, status: 'running', duration };
  }

  async pause(): Promise<void> {
    await this.#postOp('pause');
    this.#state = { ...this.#state, status: 'paused' };
  }

  async resume(): Promise<void> {
    await this.#postOp('continue');
    this.#state = { ...this.#state, status: 'running' };
  }

  async finish(): Promise<void> {
    await this.#postOp('finish');
    this.#state = { ...this.#state, status: 'idle', pomoCount: this.#state.pomoCount + 1 };
  }

  async stop(): Promise<void> {
    await this.#postOp('drop');
    this.#state = { ...this.#state, status: 'idle' };
  }

  async #postOp(op: string): Promise<void> {
    await this.client.request('POST', '/api/v2/pomodoro', [
      { id: generateObjectId(), op, lastPoint: this.#state.lastPoint },
    ]);
  }

  // ───────── #21 Analytics ─────────

  // Params: date strings (YYYY-MM-DD). API expects ms timestamps.
  async getTiming(startDate: string, endDate: string): Promise<unknown> {
    return this.client.request(
      'GET',
      `/api/v2/pomodoros/timing?from=${toMs(startDate)}&to=${toMs(endDate)}`,
    );
  }

  async getHeatmap(startDate: string, endDate: string): Promise<unknown> {
    return this.client.request(
      'GET',
      `/api/v2/pomodoros/statistics/heatmap?from=${toMs(startDate)}&to=${toMs(endDate)}`,
    );
  }

  async getHourDistribution(startDate: string, endDate: string): Promise<unknown> {
    return this.client.request(
      'GET',
      `/api/v2/pomodoros/statistics/hourDistribution?from=${toMs(startDate)}&to=${toMs(endDate)}`,
    );
  }

  async getDistribution(startDate: string, endDate: string): Promise<unknown> {
    return this.client.request(
      'GET',
      `/api/v2/pomodoros/statistics/distribution?from=${toMs(startDate)}&to=${toMs(endDate)}`,
    );
  }

  // ───────── #22 Local state ─────────

  getState(): FocusState {
    return this.#state;
  }

  resetState(): void {
    this.#state = { ...DEFAULT_STATE };
  }

  async syncState(): Promise<FocusState> {
    const remote = await this.client.request<Partial<FocusState>>('GET', '/api/v2/timer');
    this.#state = { ...DEFAULT_STATE, ...remote };
    return this.#state;
  }
}
