import { TickTickClient } from '../src/client.js';
import type { TickTickSession } from '../src/types.js';

export type MockResponse = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
};

export type MockFetch = typeof globalThis.fetch & {
  calls: [string, RequestInit?][];
};

export const TEST_SESSION: TickTickSession = {
  username: 'test@example.com',
  token: 'test-token',
  cookies: { t: 'test-token' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function createMockFetch(responses: MockResponse[]): MockFetch {
  let callIndex = 0;
  const calls: [string, RequestInit?][] = [];

  const fn = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push([url, init]);
    const r = responses[callIndex] ?? responses[responses.length - 1]!;
    callIndex++;
    return new Response(JSON.stringify(r.body ?? {}), {
      status: r.status,
      headers: { 'content-type': 'application/json', ...r.headers },
    });
  };

  (fn as MockFetch).calls = calls;
  return fn as MockFetch;
}

export function createClient(responses: MockResponse[]): {
  client: TickTickClient;
  mockFetch: MockFetch;
} {
  const mockFetch = createMockFetch(responses);
  const client = new TickTickClient({ session: TEST_SESSION, fetch: mockFetch });
  return { client, mockFetch };
}
