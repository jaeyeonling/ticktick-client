export function parseCookies(headers: Headers): Record<string, string> {
  const setCookieHeaders =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie') ?? ''].filter(Boolean);

  const cookies: Record<string, string> = {};
  for (const header of setCookieHeaders) {
    const nameValue = header.split(';')[0] ?? '';
    const eqIdx = nameValue.indexOf('=');
    if (eqIdx !== -1) {
      const name = nameValue.substring(0, eqIdx).trim();
      const value = nameValue.substring(eqIdx + 1).trim();
      if (name) cookies[name] = value;
    }
  }
  return cookies;
}

export function serializeCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export function mergeCookies(
  base: Record<string, string>,
  next: Record<string, string>,
): Record<string, string> {
  return { ...base, ...next };
}
