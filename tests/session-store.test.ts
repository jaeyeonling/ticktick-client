import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { MemorySessionStore, FileSessionStore } from '../src/session-store.js';
import type { TickTickSession } from '../src/types.js';

const mockSession: TickTickSession = {
  username: 'test@example.com',
  token: 'test-token',
  cookies: { t: 'test-token' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('MemorySessionStore', () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  it('should return null when no session', async () => {
    expect(await store.load()).toBeNull();
  });

  it('should save and load session', async () => {
    await store.save(mockSession);
    expect(await store.load()).toEqual(mockSession);
  });

  it('should overwrite existing session on save', async () => {
    await store.save(mockSession);
    const updated = { ...mockSession, token: 'new-token' };
    await store.save(updated);
    expect((await store.load())?.token).toBe('new-token');
  });

  it('should delete session', async () => {
    await store.save(mockSession);
    await store.delete();
    expect(await store.load()).toBeNull();
  });
});

describe('FileSessionStore', () => {
  let store: FileSessionStore;
  let filePath: string;

  beforeEach(() => {
    filePath = join(tmpdir(), `ticktick-test-${Date.now()}.json`);
    store = new FileSessionStore(filePath);
  });

  afterEach(async () => {
    await unlink(filePath).catch(() => {});
  });

  it('should return null when file does not exist', async () => {
    expect(await store.load()).toBeNull();
  });

  it('should save and load session', async () => {
    await store.save(mockSession);
    expect(await store.load()).toEqual(mockSession);
  });

  it('should persist across store instances', async () => {
    await store.save(mockSession);
    const store2 = new FileSessionStore(filePath);
    expect(await store2.load()).toEqual(mockSession);
  });

  it('should delete session file', async () => {
    await store.save(mockSession);
    await store.delete();
    expect(await store.load()).toBeNull();
  });

  it('should not throw when deleting non-existent file', async () => {
    await expect(store.delete()).resolves.not.toThrow();
  });
});
