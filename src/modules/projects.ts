import type { TickTickClient } from '../client.js';
import type { TickTickProject } from '../types.js';

export class ProjectsModule {
  constructor(private readonly client: TickTickClient) {}

  async list(): Promise<readonly TickTickProject[]> {
    return this.client.request<readonly TickTickProject[]>('GET', '/api/v2/projects');
  }
}
