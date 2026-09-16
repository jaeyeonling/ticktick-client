type SetCookieEntry = {
  readonly name: string;
  readonly value: string;
  readonly isExpired: boolean;
};

function readSetCookieHeaders(headers: Headers): readonly string[] {
  return typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie') ?? ''].filter(Boolean);
}

/**
 * A `Set-Cookie` with `Max-Age<=0` or a past `Expires` is the server's way of
 * deleting a cookie. Treating it as a normal value would keep a dead session
 * cookie alive in the store.
 */
function isExpiredAttribute(attributes: readonly string[]): boolean {
  for (const attribute of attributes) {
    const [rawKey, ...rest] = attribute.split('=');
    const key = (rawKey ?? '').trim().toLowerCase();
    const value = rest.join('=').trim();
    if (key === 'max-age' && Number(value) <= 0) return true;
    if (key === 'expires') {
      const expiresAt = Date.parse(value);
      if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) return true;
    }
  }
  return false;
}

function parseSetCookieEntries(headers: Headers): readonly SetCookieEntry[] {
  return readSetCookieHeaders(headers).flatMap((header) => {
    const [nameValue = '', ...attributes] = header.split(';');
    const eqIdx = nameValue.indexOf('=');
    if (eqIdx === -1) return [];
    const name = nameValue.substring(0, eqIdx).trim();
    if (!name) return [];
    return [
      {
        name,
        value: nameValue.substring(eqIdx + 1).trim(),
        isExpired: isExpiredAttribute(attributes),
      },
    ];
  });
}

export type CookieChanges = {
  /** Cookies that end this response with a live value. */
  readonly set: Record<string, string>;
  /** Cookies that end this response deleted. */
  readonly deleted: readonly string[];
};

/**
 * Folds every `Set-Cookie` of a response in header order so that the last
 * operation on each name wins: a delete followed by a reissue keeps the new
 * value, a set followed by a delete ends up deleted.
 */
export function parseCookieChanges(headers: Headers): CookieChanges {
  const final = new Map<string, string | null>();
  for (const entry of parseSetCookieEntries(headers)) {
    final.set(entry.name, entry.isExpired ? null : entry.value);
  }
  return {
    set: Object.fromEntries([...final].filter((kv): kv is [string, string] => kv[1] !== null)),
    deleted: [...final].filter(([, v]) => v === null).map(([name]) => name),
  };
}

/** Cookies a response leaves with a live value (see {@link parseCookieChanges}). */
export function parseCookies(headers: Headers): Record<string, string> {
  return parseCookieChanges(headers).set;
}

/** Cookie names a response leaves deleted (see {@link parseCookieChanges}). */
export function parseExpiredCookieNames(headers: Headers): readonly string[] {
  return parseCookieChanges(headers).deleted;
}

/** Renders a cookie jar as a `Cookie` request header value. */
export function serializeCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/** Returns `base` overlaid with `next`, minus every name in `expiredNames`. Never mutates inputs. */
export function mergeCookies(
  base: Record<string, string>,
  next: Record<string, string>,
  expiredNames: readonly string[] = [],
): Record<string, string> {
  const expired = new Set(expiredNames);
  return Object.fromEntries(
    Object.entries({ ...base, ...next }).filter(([name]) => !expired.has(name)),
  );
}
