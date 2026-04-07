import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type { TickTickCountdown, TickTickCountdownDraft } from '../types.js';

function toDateInt(date: Date | number | string): number {
  if (typeof date === 'number') return date;
  const d = date instanceof Date ? date : new Date(date);
  return parseInt(d.toISOString().slice(0, 10).replace(/-/g, ''), 10);
}

export class CountdownsModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickCountdown[]> {
    const res = await this.client.request<{ countdowns: readonly TickTickCountdown[] }>(
      'GET',
      '/api/v2/countdown/list',
    );
    return res.countdowns ?? [];
  }

  async create(draft: TickTickCountdownDraft): Promise<void> {
    await this.client.request('POST', '/api/v2/countdown/batch', {
      add: [{ id: generateObjectId(), ...draft, date: toDateInt(draft.date) }],
      update: [],
      delete: [],
    });
  }

  async update(params: Partial<TickTickCountdownDraft> & { id: string }): Promise<void> {
    const { date, ...rest } = params;
    await this.client.request('POST', '/api/v2/countdown/batch', {
      add: [],
      update: [{ ...rest, ...(date !== undefined && { date: toDateInt(date) }) }],
      delete: [],
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.request('POST', '/api/v2/countdown/batch', {
      add: [],
      update: [],
      delete: [id],
    });
  }
}
