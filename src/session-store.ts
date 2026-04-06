import type { TickTickSession } from './types.js';

export type TickTickSessionStore = {
  load(): Promise<TickTickSession | null>;
  save(session: TickTickSession): Promise<void>;
  delete(): Promise<void>;
};

export class MemorySessionStore implements TickTickSessionStore {
  #session: TickTickSession | null = null;

  async load(): Promise<TickTickSession | null> {
    return this.#session;
  }

  async save(session: TickTickSession): Promise<void> {
    this.#session = session;
  }

  async delete(): Promise<void> {
    this.#session = null;
  }
}

export class FileSessionStore implements TickTickSessionStore {
  constructor(private readonly path: string) {}

  async load(): Promise<TickTickSession | null> {
    try {
      const { readFile } = await import('node:fs/promises');
      const raw = await readFile(this.path, 'utf-8');
      return JSON.parse(raw) as TickTickSession;
    } catch {
      return null;
    }
  }

  async save(session: TickTickSession): Promise<void> {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(this.path, JSON.stringify(session, null, 2), 'utf-8');
  }

  async delete(): Promise<void> {
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(this.path);
    } catch {
      // ignore if file does not exist
    }
  }
}
