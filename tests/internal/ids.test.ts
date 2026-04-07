import { describe, it, expect } from 'vitest';
import { generateObjectId } from '../../src/internal/ids.js';

describe('generateObjectId', () => {
  it('should return a 24-character hex string', () => {
    const id = generateObjectId();
    expect(id).toHaveLength(24);
    expect(id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateObjectId()));
    expect(ids.size).toBe(100);
  });

  it('should encode current timestamp in first 8 chars', () => {
    const before = Math.floor(Date.now() / 1000);
    const id = generateObjectId();
    const after = Math.floor(Date.now() / 1000);
    const timestamp = parseInt(id.slice(0, 8), 16);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
