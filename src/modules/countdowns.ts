import { generateObjectId } from '../internal/ids.js';
import type { TickTickClient } from '../client.js';
import type { TickTickCountdown, TickTickCountdownDraft } from '../types.js';

function toDateString(date: Date | number | string): string {
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'number') return new Date(date).toISOString();
  return date;
}

export class CountdownsModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickCountdown[]> {
    return this.client.request<readonly TickTickCountdown[]>('GET', '/api/v2/countdowns');
  }

  async create(draft: TickTickCountdownDraft): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/countdown', {
      add: [{ id: generateObjectId(), ...draft, date: toDateString(draft.date) }],
    });
  }

  async update(params: Partial<TickTickCountdownDraft> & { id: string }): Promise<void> {
    const { date, ...rest } = params;
    await this.client.request('POST', '/api/v2/batch/countdown', {
      update: [{ ...rest, ...(date !== undefined && { date: toDateString(date) }) }],
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.request('POST', '/api/v2/batch/countdown', { delete: [id] });
  }
}
