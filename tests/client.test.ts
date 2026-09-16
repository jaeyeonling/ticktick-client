import { describe, it, expect } from 'vitest';
import { TickTickClient } from '../src/client.js';
import { TickTickAuthError, TickTickApiError } from '../src/errors.js';
import { MemorySessionStore } from '../src/session-store.js';
import { TEST_SESSION, createMockFetch } from './helpers.js';

describe('TickTickClient - login', () => {
  it('should throw TickTickAuthError if no credentials', async () => {
    const client = new TickTickClient({ fetch: createMockFetch([]) });
    await expect(client.login()).rejects.toThrow(TickTickAuthError);
  });

  it('should login and persist session to store', async () => {
    const store = new MemorySessionStore();
    const client = new TickTickClient({
      credentials: { username: 'user@example.com', password: 'pass' },
      sessionStore: store,
      fetch: createMockFetch([
        {
          status: 200,
          body: {},
          headers: { 'set-cookie': 't=newtoken; Path=/' },
        },
      ]),
    });

    await client.login();

    const session = await store.load();
    expect(session?.username).toBe('user@example.com');
    expect(session?.token).toBe('newtoken');
  });

  it('should throw TickTickAuthError on non-ok response', async () => {
    const client = new TickTickClient({
      credentials: { username: 'user@example.com', password: 'wrong' },
      fetch: createMockFetch([{ status: 401, body: 'Unauthorized' }]),
    });
    await expect(client.login()).rejects.toThrow(TickTickAuthError);
  });
});

describe('TickTickClient - logout', () => {
  it('should clear in-memory session', async () => {
    const client = new TickTickClient({
      session: TEST_SESSION,
      fetch: createMockFetch([]),
    });
    await client.logout();
    expect(client.getSession()).toBeNull();
  });

  it('should clear session from store', async () => {
    const store = new MemorySessionStore();
    await store.save(TEST_SESSION);
    const client = new TickTickClient({
      session: TEST_SESSION,
      sessionStore: store,
      fetch: createMockFetch([]),
    });
    await client.logout();
    expect(await store.load()).toBeNull();
  });
});

describe('TickTickClient - isAuthenticated', () => {
  it('should return true when API call succeeds', async () => {
    const client = new TickTickClient({
      session: TEST_SESSION,
      fetch: createMockFetch([{ status: 200, body: {} }]),
    });
    expect(await client.isAuthenticated()).toBe(true);
  });

  it('should return false when no session', async () => {
    const client = new TickTickClient({ fetch: createMockFetch([]) });
    expect(await client.isAuthenticated()).toBe(false);
  });

  it('should return false when API call fails', async () => {
    const client = new TickTickClient({
      session: TEST_SESSION,
      fetch: createMockFetch([{ status: 401, body: {} }]),
    });
    expect(await client.isAuthenticated()).toBe(false);
  });
});

describe('TickTickClient - getSession', () => {
  it('should return session when provided', () => {
    const client = new TickTickClient({
      session: TEST_SESSION,
      fetch: createMockFetch([]),
    });
    expect(client.getSession()).toEqual(TEST_SESSION);
  });

  it('should return null when no session', () => {
    const client = new TickTickClient({ fetch: createMockFetch([]) });
    expect(client.getSession()).toBeNull();
  });
});

describe('TickTickClient - request', () => {
  it('should throw TickTickAuthError when no session and no credentials', async () => {
    const client = new TickTickClient({ fetch: createMockFetch([]) });
    await expect(client.tasks.list()).rejects.toThrow(TickTickAuthError);
  });

  it('should throw TickTickApiError on non-ok response', async () => {
    const client = new TickTickClient({
      session: TEST_SESSION,
      fetch: createMockFetch([{ status: 500, body: { errorMessage: 'Server Error' } }]),
    });
    await expect(client.tasks.list()).rejects.toThrow(TickTickApiError);
  });

  it('should auto-login when credentials provided and no session', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: {}, headers: { 'set-cookie': 't=tok; Path=/' } },
      { status: 200, body: { syncTaskBean: { update: [] } } },
    ]);
    const client = new TickTickClient({
      credentials: { username: 'user@example.com', password: 'pass' },
      fetch: mockFetch,
    });

    const tasks = await client.tasks.list();
    expect(tasks).toEqual([]);
    expect(mockFetch.calls).toHaveLength(2);
  });

  it('should re-authenticate on 401 and retry request', async () => {
    const mockFetch = createMockFetch([
      { status: 401, body: {} },
      {
        status: 200,
        body: {},
        headers: { 'set-cookie': 't=newtoken; Path=/' },
      },
      { status: 200, body: { syncTaskBean: { update: [] } } },
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: { username: 'user@example.com', password: 'pass' },
      fetch: mockFetch,
    });

    const tasks = await client.tasks.list();
    expect(tasks).toEqual([]);
    expect(mockFetch.calls).toHaveLength(3);
  });

  it('should throw TickTickAuthError if re-auth fails', async () => {
    const mockFetch = createMockFetch([
      { status: 401, body: {} },
      { status: 401, body: {} },
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: { username: 'user@example.com', password: 'pass' },
      fetch: mockFetch,
    });

    await expect(client.tasks.list()).rejects.toThrow(TickTickAuthError);
  });

  it('should load session from store on first request', async () => {
    const store = new MemorySessionStore();
    await store.save(TEST_SESSION);

    const mockFetch = createMockFetch([{ status: 200, body: { syncTaskBean: { update: [] } } }]);
    const client = new TickTickClient({
      sessionStore: store,
      fetch: mockFetch,
    });

    const tasks = await client.tasks.list();
    expect(tasks).toEqual([]);
  });

  it('should include auth headers in requests', async () => {
    const mockFetch = createMockFetch([{ status: 200, body: { syncTaskBean: { update: [] } } }]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      fetch: mockFetch,
    });

    await client.tasks.list();

    const headers = mockFetch.calls[0]![1]?.headers as Record<string, string>;
    expect(headers['cookie']).toContain('t=test-token');
  });
});

describe('TickTickClient - re-authentication hardening', () => {
  const CREDENTIALS = { username: 'user@example.com', password: 'pass' };
  const LOGIN_OK = {
    status: 200,
    body: {},
    headers: { 'set-cookie': 't=newtoken; Path=/' },
  };
  const LIST_OK = { status: 200, body: { syncTaskBean: { update: [] } } };

  function loginCalls(mockFetch: ReturnType<typeof createMockFetch>): number {
    return mockFetch.calls.filter(([url]) => url.includes('/user/signon')).length;
  }

  it('should share a single login across concurrent 401 responses', async () => {
    // Arrange: two parallel requests both hit 401, one login, then both retries succeed
    const mockFetch = createMockFetch([
      { status: 401, body: {} },
      { status: 401, body: {} },
      LOGIN_OK,
      LIST_OK,
      LIST_OK,
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: CREDENTIALS,
      fetch: mockFetch,
    });

    // Act
    await Promise.all([client.tasks.list(), client.tasks.list()]);

    // Assert
    expect(loginCalls(mockFetch)).toBe(1);
  });

  it('should still re-login when the 401 response itself carries Set-Cookie', async () => {
    // Regression: a cookie-bearing 401 must not be mistaken for a concurrent refresh
    const mockFetch = createMockFetch([
      {
        status: 401,
        body: {},
        headers: { 'set-cookie': 't=; Max-Age=0; Path=/' },
      },
      LOGIN_OK,
      LIST_OK,
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: CREDENTIALS,
      fetch: mockFetch,
    });

    await client.tasks.list();
    expect(loginCalls(mockFetch)).toBe(1);
    expect(mockFetch.calls).toHaveLength(3);
  });

  it('should not re-login on a plain 403 permission error', async () => {
    const mockFetch = createMockFetch([{ status: 403, body: { errorCode: 'no_permission' } }]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: CREDENTIALS,
      fetch: mockFetch,
    });

    await expect(client.tasks.list()).rejects.toThrow(TickTickApiError);
    expect(loginCalls(mockFetch)).toBe(0);
  });

  it('should re-login on 403 with an auth-related error code', async () => {
    const mockFetch = createMockFetch([
      { status: 403, body: { errorCode: 'user_not_sign_on' } },
      LOGIN_OK,
      LIST_OK,
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: CREDENTIALS,
      fetch: mockFetch,
    });

    await client.tasks.list();
    expect(loginCalls(mockFetch)).toBe(1);
  });

  it('should honour a custom reauthenticateOn policy', async () => {
    const mockFetch = createMockFetch([
      { status: 500, body: { errorCode: 'unknown_exception' } },
      LOGIN_OK,
      LIST_OK,
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: CREDENTIALS,
      fetch: mockFetch,
      reauthenticateOn: (err) => err.status === 500,
    });

    await client.tasks.list();
    expect(loginCalls(mockFetch)).toBe(1);
  });

  it('should attach the original error as cause when re-auth fails', async () => {
    const mockFetch = createMockFetch([
      { status: 401, body: {} },
      { status: 429, body: { errorCode: 'exceed_query_limit' } },
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: CREDENTIALS,
      fetch: mockFetch,
    });

    const err = await client.tasks.list().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TickTickAuthError);
    expect((err as Error).cause).toBeInstanceOf(TickTickAuthError);
    expect(String(((err as Error).cause as Error).message)).toContain('429');
  });

  it('should persist deviceId on login and reuse it from a stored session', async () => {
    const store = new MemorySessionStore();
    const first = new TickTickClient({
      credentials: CREDENTIALS,
      sessionStore: store,
      fetch: createMockFetch([LOGIN_OK]),
    });
    await first.login();
    const saved = await store.load();
    expect(saved?.deviceId).toMatch(/^[0-9a-f]{24}$/);

    const mockFetch = createMockFetch([LIST_OK]);
    const second = new TickTickClient({
      sessionStore: store,
      fetch: mockFetch,
    });
    await second.tasks.list();

    const headers = mockFetch.calls[0]?.[1]?.headers as Record<string, string>;
    const xDevice = JSON.parse(headers['x-device'] ?? '{}') as { id: string };
    expect(xDevice.id).toBe(saved?.deviceId);
  });

  it('should reuse the stored deviceId when login() is called directly', async () => {
    const store = new MemorySessionStore();
    await store.save({ ...TEST_SESSION, deviceId: 'a1b2c3d4e5f6a1b2c3d4e5f6' });
    const mockFetch = createMockFetch([LOGIN_OK]);
    const client = new TickTickClient({
      credentials: CREDENTIALS,
      sessionStore: store,
      fetch: mockFetch,
    });

    await client.login();

    const headers = mockFetch.calls[0]?.[1]?.headers as Record<string, string>;
    const xDevice = JSON.parse(headers['x-device'] ?? '{}') as { id: string };
    expect(xDevice.id).toBe('a1b2c3d4e5f6a1b2c3d4e5f6');
    expect((await store.load())?.deviceId).toBe('a1b2c3d4e5f6a1b2c3d4e5f6');
  });

  it('should clear the csrfToken mirror when the server deletes the _csrf_token cookie', async () => {
    const store = new MemorySessionStore();
    await store.save({
      ...TEST_SESSION,
      csrfToken: 'csrf',
      cookies: { t: 'test-token', _csrf_token: 'csrf' },
    });
    const mockFetch = createMockFetch([
      { ...LIST_OK, headers: { 'set-cookie': '_csrf_token=; Max-Age=0; Path=/' } },
      LIST_OK,
    ]);
    const client = new TickTickClient({ sessionStore: store, fetch: mockFetch });

    await client.tasks.list();
    await client.tasks.list();

    expect((await store.load())?.csrfToken).toBeUndefined();
    const headers = mockFetch.calls[1]?.[1]?.headers as Record<string, string>;
    expect(headers['x-csrftoken']).toBe('');
  });

  it('should not re-login on a 500 whose message merely mentions auth', async () => {
    const mockFetch = createMockFetch([
      { status: 500, body: { errorMessage: 'authentication service unavailable' } },
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: CREDENTIALS,
      fetch: mockFetch,
    });

    await expect(client.tasks.list()).rejects.toThrow(TickTickApiError);
    expect(loginCalls(mockFetch)).toBe(0);
  });

  it('should not re-login on a 403 "not authorized" permission message', async () => {
    const mockFetch = createMockFetch([
      { status: 403, body: { errorCode: 'no_permission', errorMessage: 'not authorized' } },
    ]);
    const client = new TickTickClient({
      session: TEST_SESSION,
      credentials: CREDENTIALS,
      fetch: mockFetch,
    });

    await expect(client.tasks.list()).rejects.toThrow(TickTickApiError);
    expect(loginCalls(mockFetch)).toBe(0);
  });

  it('should drop cookies the server deleted from the persisted session', async () => {
    const store = new MemorySessionStore();
    await store.save({
      ...TEST_SESSION,
      cookies: { t: 'test-token', extra: 'x' },
    });
    const client = new TickTickClient({
      sessionStore: store,
      fetch: createMockFetch([
        { ...LIST_OK, headers: { 'set-cookie': 'extra=; Max-Age=0; Path=/' } },
      ]),
    });

    await client.tasks.list();
    expect((await store.load())?.cookies).toEqual({ t: 'test-token' });
  });
});

describe('TickTickClient - isAuthenticated propagation', () => {
  it('should return false on auth failure but rethrow network errors', async () => {
    const failingFetch = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof globalThis.fetch;
    const client = new TickTickClient({
      session: TEST_SESSION,
      fetch: failingFetch,
    });
    await expect(client.isAuthenticated()).rejects.toThrow('fetch failed');
  });
});
