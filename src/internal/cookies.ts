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

export function parseCookies(headers: Headers): Record<string, string> {
  return Object.fromEntries(
    parseSetCookieEntries(headers)
      .filter((entry) => !entry.isExpired)
      .map((entry) => [entry.name, entry.value]),
  );
}

export function parseExpiredCookieNames(headers: Headers): readonly string[] {
  return parseSetCookieEntries(headers)
    .filter((entry) => entry.isExpired)
    .map((entry) => entry.name);
}

export function serializeCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

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
