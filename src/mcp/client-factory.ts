import { TickTickClient } from '../client.js';
import { FileSessionStore } from '../session-store.js';
import { config } from './config.js';

export function createClient(): TickTickClient {
  const { username, password } = config;

  if (!username || !password) {
    throw new Error(
      'TICKTICK_USERNAME and TICKTICK_PASSWORD environment variables are required.',
    );
  }

  return new TickTickClient({
    credentials: { username, password },
    sessionStore: new FileSessionStore(config.sessionPath),
    ...(config.baseUrl && { baseUrl: config.baseUrl }),
    ...(config.timeZone && { timeZone: config.timeZone }),
  });
}
