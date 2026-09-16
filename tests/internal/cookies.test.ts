import { describe, it, expect } from 'vitest';
import {
  parseCookies,
  parseExpiredCookieNames,
  serializeCookies,
  mergeCookies,
} from '../../src/internal/cookies.js';

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

describe('parseCookies - expiry', () => {
  it('should drop cookies deleted via Max-Age=0', () => {
    const headers = new Headers({ 'set-cookie': 't=; Max-Age=0; Path=/' });
    expect(parseCookies(headers)).toEqual({});
  });

  it('should drop cookies with an Expires date in the past', () => {
    const headers = new Headers({
      'set-cookie': 't=stale; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/',
    });
    expect(parseCookies(headers)).toEqual({});
  });

  it('should keep cookies with a future Expires date', () => {
    const headers = new Headers({
      'set-cookie': 't=fresh; Expires=Fri, 01 Jan 2100 00:00:00 GMT; Path=/',
    });
    expect(parseCookies(headers)).toEqual({ t: 'fresh' });
  });
});

describe('parseExpiredCookieNames', () => {
  it('should list names of cookies the server deleted', () => {
    const headers = new Headers({ 'set-cookie': 't=; Max-Age=0; Path=/' });
    expect(parseExpiredCookieNames(headers)).toEqual(['t']);
  });

  it('should return empty array when nothing expired', () => {
    const headers = new Headers({ 'set-cookie': 't=abc; Path=/' });
    expect(parseExpiredCookieNames(headers)).toEqual([]);
  });
});

describe('parseCookies - order within one response', () => {
  it('should keep a cookie reissued after being deleted in the same response', () => {
    const headers = new Headers();
    headers.append('set-cookie', 't=; Max-Age=0; Path=/');
    headers.append('set-cookie', 't=fresh; Path=/');
    expect(parseCookies(headers)).toEqual({ t: 'fresh' });
    expect(parseExpiredCookieNames(headers)).toEqual([]);
  });

  it('should treat a cookie deleted after being set in the same response as deleted', () => {
    const headers = new Headers();
    headers.append('set-cookie', 't=stale; Path=/');
    headers.append('set-cookie', 't=; Max-Age=0; Path=/');
    expect(parseCookies(headers)).toEqual({});
    expect(parseExpiredCookieNames(headers)).toEqual(['t']);
  });
});

describe('mergeCookies - removal', () => {
  it('should remove expired cookie names from the result', () => {
    expect(mergeCookies({ t: 'old', a: '1' }, { b: '2' }, ['t'])).toEqual({
      a: '1',
      b: '2',
    });
  });
});
