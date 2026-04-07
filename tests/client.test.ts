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
      fetch: createMockFetch([{
        status: 200,
        body: {},
        headers: { 'set-cookie': 't=newtoken; Path=/' },
      }]),
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
    const client = new TickTickClient({ session: TEST_SESSION, fetch: createMockFetch([]) });
    await client.logout();
    expect(client.getSession()).toBeNull();
  });

  it('should clear session from store', async () => {
    const store = new MemorySessionStore();
    await store.save(TEST_SESSION);
    const client = new TickTickClient({ session: TEST_SESSION, sessionStore: store, fetch: createMockFetch([]) });
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
    const client = new TickTickClient({ session: TEST_SESSION, fetch: createMockFetch([]) });
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
      { status: 200, body: {}, headers: { 'set-cookie': 't=newtoken; Path=/' } },
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
    const client = new TickTickClient({ sessionStore: store, fetch: mockFetch });

    const tasks = await client.tasks.list();
    expect(tasks).toEqual([]);
  });

  it('should include auth headers in requests', async () => {
    const mockFetch = createMockFetch([{ status: 200, body: { syncTaskBean: { update: [] } } }]);
    const client = new TickTickClient({ session: TEST_SESSION, fetch: mockFetch });

    await client.tasks.list();

    const headers = mockFetch.calls[0]![1]?.headers as Record<string, string>;
    expect(headers['cookie']).toContain('t=test-token');
  });
});
