import { describe, it, expect } from 'vitest';
import { TickTickError, TickTickAuthError, TickTickApiError } from '../src/errors.js';

describe('TickTickError', () => {
  it('should be an instance of Error', () => {
    const err = new TickTickError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('test');
    expect(err.name).toBe('TickTickError');
  });
});

describe('TickTickAuthError', () => {
  it('should extend TickTickError', () => {
    const err = new TickTickAuthError('auth failed');
    expect(err).toBeInstanceOf(TickTickError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('TickTickAuthError');
    expect(err.message).toBe('auth failed');
  });
});

describe('TickTickApiError', () => {
  it('should store all properties', () => {
    const err = new TickTickApiError('api error', 'https://api.ticktick.com/foo', 'GET', 404, { code: 'NOT_FOUND' });
    expect(err).toBeInstanceOf(TickTickError);
    expect(err.name).toBe('TickTickApiError');
    expect(err.message).toBe('api error');
    expect(err.url).toBe('https://api.ticktick.com/foo');
    expect(err.method).toBe('GET');
    expect(err.status).toBe(404);
    expect(err.responseBody).toEqual({ code: 'NOT_FOUND' });
  });

  it('should accept null responseBody', () => {
    const err = new TickTickApiError('error', '/foo', 'POST', 500, null);
    expect(err.responseBody).toBeNull();
  });
});
