import { TickTickAuthError, TickTickApiError } from './errors.js';
import {
  parseCookies,
  parseCookieChanges,
  serializeCookies,
  mergeCookies,
} from './internal/cookies.js';
import { generateObjectId } from './internal/ids.js';
import type { TickTickSession } from './types.js';
import type { TickTickSessionStore } from './session-store.js';
import { TasksModule } from './modules/tasks.js';
import { ProjectsModule } from './modules/projects.js';
import { TagsModule } from './modules/tags.js';
import { HabitsModule } from './modules/habits.js';
import { FocusModule } from './modules/focus.js';
import { StatisticsModule } from './modules/statistics.js';
import { UserModule } from './modules/user.js';
import { CountdownsModule } from './modules/countdowns.js';

// ───────── Types ─────────

export type TickTickClientOptions = {
  readonly credentials?: {
    readonly username: string;
    readonly password: string;
  };
  readonly session?: TickTickSession;
  readonly sessionStore?: TickTickSessionStore;
  readonly baseUrl?: string;
  readonly timeZone?: string;
  readonly fetch?: typeof globalThis.fetch;
  /**
   * Decides whether a failed API response means the session expired and a
   * re-login should be attempted. Defaults to {@link isSessionExpiredError}.
   */
  readonly reauthenticateOn?: (error: TickTickApiError) => boolean;
};

// ───────── Constants ─────────

const DEFAULT_BASE_URL = 'https://api.ticktick.com';
const DEFAULT_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const BASE_HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  origin: 'https://ticktick.com',
  referer: 'https://ticktick.com/webapp/',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest',
  hl: 'en_US',
} as const;

// ───────── Client ─────────

export class TickTickClient {
  readonly tasks: TasksModule;
  readonly projects: ProjectsModule;
  readonly tags: TagsModule;
  readonly habits: HabitsModule;
  readonly focus: FocusModule;
  readonly statistics: StatisticsModule;
  readonly user: UserModule;
  readonly countdowns: CountdownsModule;

  readonly #fetchFn: typeof globalThis.fetch;
  readonly #baseUrl: string;
  readonly #timeZone: string;
  readonly #credentials: TickTickClientOptions['credentials'];
  readonly #sessionStore: TickTickSessionStore | undefined;
  readonly #reauthenticateOn: (error: TickTickApiError) => boolean;

  #deviceId: string;
  #session: TickTickSession | null;
  #sessionLoaded: boolean;
  /** In-flight login shared by concurrent callers so one expiry triggers one signon. */
  #loginInFlight: Promise<void> | null = null;
  /** Bumped on every successful login; lets a retry detect a login it did not trigger. */
  #loginGeneration = 0;

  constructor(options: TickTickClientOptions = {}) {
    this.#fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.#timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
    this.#credentials = options.credentials;
    this.#sessionStore = options.sessionStore;
    this.#reauthenticateOn = options.reauthenticateOn ?? isSessionExpiredError;
    this.#deviceId = options.session?.deviceId ?? generateObjectId();
    this.#session = options.session ?? null;
    this.#sessionLoaded = options.session != null;

    this.tasks = new TasksModule(this);
    this.projects = new ProjectsModule(this);
    this.tags = new TagsModule(this);
    this.habits = new HabitsModule(this);
    this.focus = new FocusModule(this);
    this.statistics = new StatisticsModule(this);
    this.user = new UserModule(this);
    this.countdowns = new CountdownsModule(this);
  }

  // ───────── Auth ─────────

  /**
   * Signs in with the configured credentials and replaces the stored session.
   * Concurrent callers share one in-flight signon. The stored session is
   * loaded first so an existing `deviceId` is reused rather than replaced.
   */
  async login(): Promise<void> {
    if (!this.#credentials) {
      throw new TickTickAuthError('No credentials provided.');
    }
    await this.#loadSession();
    if (this.#loginInFlight) return this.#loginInFlight;

    this.#loginInFlight = this.#performLogin(this.#credentials).finally(() => {
      this.#loginInFlight = null;
    });
    return this.#loginInFlight;
  }

  async #performLogin(
    credentials: NonNullable<TickTickClientOptions['credentials']>,
  ): Promise<void> {
    const url = `${this.#baseUrl}/api/v2/user/signon?wc=true&remember=true`;
    const response = await this.#fetchFn(url, {
      method: 'POST',
      headers: { ...BASE_HEADERS, ...this.#buildDeviceHeaders() },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new TickTickAuthError(`Login failed (${response.status}): ${body}`);
    }

    // A fresh login replaces the whole cookie jar; nothing from the old session is kept.
    const cookies = parseCookies(response.headers);
    const now = new Date().toISOString();
    await this.#setSession({
      username: credentials.username,
      token: cookies['t'] ?? '',
      ...(cookies['_csrf_token'] !== undefined && {
        csrfToken: cookies['_csrf_token'],
      }),
      cookies,
      deviceId: this.#deviceId,
      createdAt: now,
      updatedAt: now,
    });
    this.#loginGeneration += 1;
  }

  /** Forgets the in-memory session and deletes it from the store. */
  async logout(): Promise<void> {
    this.#session = null;
    this.#sessionLoaded = false;
    await this.#sessionStore?.delete();
  }

  /**
   * Probes the profile endpoint with the current session. Returns `false` only
   * for a session-expiry response; network and other API errors are rethrown.
   */
  async isAuthenticated(): Promise<boolean> {
    await this.#loadSession();
    if (!this.#session) return false;
    try {
      await this.#rawRequest('GET', '/api/v2/user/profile');
      return true;
    } catch (err) {
      if (err instanceof TickTickApiError && this.#reauthenticateOn(err)) return false;
      throw err;
    }
  }

  /** The session currently held in memory, or `null` before one is loaded or after logout. */
  getSession(): TickTickSession | null {
    return this.#session;
  }

  // ───────── Internal HTTP ─────────

  /**
   * Sends an authenticated request. On a session-expiry response (per
   * `reauthenticateOn`) it re-logs in once and retries the request once.
   */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    await this.#ensureSession();
    const generationUsed = this.#loginGeneration;
    try {
      return await this.#rawRequest<T>(method, path, body);
    } catch (err) {
      if (!(err instanceof TickTickApiError) || !this.#reauthenticateOn(err)) throw err;
      await this.#reauthenticate(generationUsed, err);
      return this.#rawRequest<T>(method, path, body);
    }
  }

  /**
   * Re-logs in after an expired-session response. If another caller already
   * replaced the session while this request was in flight, the retry simply
   * uses that newer session instead of hitting signon again.
   */
  async #reauthenticate(generationUsed: number, cause: TickTickApiError): Promise<void> {
    if (this.#loginGeneration !== generationUsed) return;
    if (!this.#credentials) {
      throw new TickTickAuthError('Session expired. Please login again.', {
        cause,
      });
    }
    try {
      await this.login();
    } catch (loginErr) {
      throw new TickTickAuthError('Re-authentication failed.', {
        cause: loginErr,
      });
    }
  }

  async #rawRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.#baseUrl}${path}`;
    const response = await this.#fetchFn(url, {
      method,
      headers: {
        ...BASE_HEADERS,
        ...this.#buildDeviceHeaders(),
        ...this.#buildAuthHeaders(),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    // Merge cookies on every response to keep session alive. The token and
    // csrfToken fields mirror the jar, so they are rebuilt from the merged
    // result rather than carried over (a deleted cookie must clear its mirror).
    const { set: newCookies, deleted } = parseCookieChanges(response.headers);
    if (this.#session && (Object.keys(newCookies).length > 0 || deleted.length > 0)) {
      const cookies = mergeCookies(this.#session.cookies, newCookies, deleted);
      const { csrfToken: _dropped, ...rest } = this.#session;
      await this.#setSession({
        ...rest,
        token: cookies['t'] ?? '',
        ...(cookies['_csrf_token'] !== undefined && { csrfToken: cookies['_csrf_token'] }),
        cookies,
        updatedAt: new Date().toISOString(),
      });
    }

    if (!response.ok) {
      const responseBody = await this.#parseBody(response);
      throw new TickTickApiError(
        `TickTick API error: ${method} ${url} → ${response.status}`,
        url,
        method,
        response.status,
        responseBody,
      );
    }

    const text = await response.text();
    if (!text.trim()) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }

  async #ensureSession(): Promise<void> {
    await this.#loadSession();
    if (!this.#session) {
      if (!this.#credentials) {
        throw new TickTickAuthError('No active session. Call login() or provide credentials.');
      }
      await this.login();
    }
  }

  async #loadSession(): Promise<void> {
    if (this.#sessionLoaded) return;
    this.#session = (await this.#sessionStore?.load()) ?? null;
    this.#sessionLoaded = true;
    if (this.#session?.deviceId) this.#deviceId = this.#session.deviceId;
  }

  async #setSession(session: TickTickSession): Promise<void> {
    this.#session = session;
    this.#sessionLoaded = true;
    await this.#sessionStore?.save(session);
  }

  #buildDeviceHeaders(): Record<string, string> {
    return { 'x-device': buildXDevice(this.#deviceId), 'x-tz': this.#timeZone };
  }

  #buildAuthHeaders(): Record<string, string> {
    if (!this.#session) return {};
    return {
      'x-csrftoken': this.#session.csrfToken ?? '',
      cookie: serializeCookies(this.#session.cookies),
    };
  }

  async #parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) return response.json();
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

/**
 * `errorCode` fragments TickTick uses for a missing or invalid session.
 * Only `errorCode` is inspected: free-text `errorMessage` values such as
 * "not authorized" describe permissions, not expiry.
 */
const SESSION_EXPIRED_CODE_FRAGMENTS = [
  'user_not_sign_on',
  'sign_on',
  'signon',
  'token',
  'login',
] as const;

/**
 * Default re-authentication policy.
 *
 * - 401 always means the session is gone (TickTick responds
 *   `401 user_not_sign_on` for an invalid `t` cookie).
 * - 403 is ambiguous: TickTick also uses it for permission errors on shared
 *   projects, so only treat it as expiry when `errorCode` is a session code.
 * - Any other status is never expiry; override `reauthenticateOn` if your
 *   account observes different failure shapes.
 */
export function isSessionExpiredError(err: TickTickApiError): boolean {
  if (err.status === 401) return true;
  if (err.status !== 403) return false;
  if (!err.responseBody || typeof err.responseBody !== 'object') return false;
  const code = (err.responseBody as Record<string, unknown>)['errorCode'];
  if (typeof code !== 'string') return false;
  const normalized = code.toLowerCase();
  return SESSION_EXPIRED_CODE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function buildXDevice(id: string): string {
  return JSON.stringify({
    platform: 'web',
    os: 'Windows 10',
    device: 'Chrome 136.0.0.0',
    name: '',
    version: 8046,
    id,
    channel: 'website',
    campaign: '',
    websocket: '',
  });
}
