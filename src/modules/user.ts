import type { TickTickClient } from '../client.js';
import type { TickTickUserProfile } from '../types.js';

export class UserModule {
  constructor(private readonly client: TickTickClient) {}

  async getProfile(): Promise<TickTickUserProfile> {
    return this.client.request<TickTickUserProfile>('GET', '/api/v2/user/profile');
  }
}
