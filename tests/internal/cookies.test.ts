import { describe, it, expect } from 'vitest';
import { parseCookies, serializeCookies, mergeCookies } from '../../src/internal/cookies.js';

describe('parseCookies', () => {
  it('should parse a single set-cookie header', () => {
    const headers = new Headers({ 'set-cookie': 't=abc123; Path=/; HttpOnly' });
    expect(parseCookies(headers)).toEqual({ t: 'abc123' });
  });

  it('should return empty object if no cookies', () => {
    expect(parseCookies(new Headers())).toEqual({});
  });

  it('should handle cookies with empty value', () => {
    const headers = new Headers({ 'set-cookie': 'novalue=; Path=/' });
    expect(parseCookies(headers)).toEqual({ novalue: '' });
  });

  it('should skip malformed entries without equals sign', () => {
    const headers = new Headers({ 'set-cookie': 'badcookie; Path=/' });
    expect(parseCookies(headers)).toEqual({});
  });
});

describe('serializeCookies', () => {
  it('should serialize single cookie', () => {
    expect(serializeCookies({ t: 'abc' })).toBe('t=abc');
  });

  it('should serialize multiple cookies separated by "; "', () => {
    const result = serializeCookies({ t: 'abc', _csrf: 'xyz' });
    expect(result).toContain('t=abc');
    expect(result).toContain('_csrf=xyz');
    expect(result).toContain('; ');
  });

  it('should return empty string for empty object', () => {
    expect(serializeCookies({})).toBe('');
  });
});

describe('mergeCookies', () => {
  it('should merge two cookie objects with next taking priority', () => {
    expect(mergeCookies({ t: 'old', a: '1' }, { t: 'new', b: '2' })).toEqual({
      t: 'new',
      a: '1',
      b: '2',
    });
  });

  it('should not mutate original objects', () => {
    const base = { t: 'old' };
    mergeCookies(base, { t: 'new' });
    expect(base.t).toBe('old');
  });

  it('should handle empty objects', () => {
    expect(mergeCookies({}, { t: 'abc' })).toEqual({ t: 'abc' });
    expect(mergeCookies({ t: 'abc' }, {})).toEqual({ t: 'abc' });
  });
});
