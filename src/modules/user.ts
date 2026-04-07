import type { TickTickClient } from '../client.js';
import type { TickTickUserProfile, TickTickUserStatus } from '../types.js';

export class UserModule {
  constructor(private readonly client: TickTickClient) {}

  async getProfile(): Promise<TickTickUserProfile> {
    return this.client.request<TickTickUserProfile>('GET', '/api/v2/user/profile');
  }

  async getStatus(): Promise<TickTickUserStatus> {
    return this.client.request<TickTickUserStatus>('GET', '/api/v2/user/status');
  }
}
