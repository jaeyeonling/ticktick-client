import { TickTickAuthError, TickTickApiError } from './errors.js';
import { parseCookies, serializeCookies, mergeCookies } from './internal/cookies.js';
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
  readonly #xDevice: string;
  readonly #credentials: TickTickClientOptions['credentials'];
  readonly #sessionStore: TickTickSessionStore | undefined;

  #session: TickTickSession | null;
  #sessionLoaded: boolean;

  constructor(options: TickTickClientOptions = {}) {
    this.#fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.#timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
    this.#xDevice = buildXDevice(generateObjectId());
    this.#credentials = options.credentials;
    this.#sessionStore = options.sessionStore;
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

  async login(): Promise<void> {
    if (!this.#credentials) {
      throw new TickTickAuthError('No credentials provided.');
    }

    const url = `${this.#baseUrl}/api/v2/user/signon?wc=true&remember=true`;
    const response = await this.#fetchFn(url, {
      method: 'POST',
      headers: { ...BASE_HEADERS, 'x-device': this.#xDevice, 'x-tz': this.#timeZone },
      body: JSON.stringify(this.#credentials),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new TickTickAuthError(`Login failed (${response.status}): ${body}`);
    }

    const cookies = parseCookies(response.headers);
    const now = new Date().toISOString();
    await this.#setSession({
      username: this.#credentials.username,
      token: cookies['t'] ?? '',
      ...(cookies['_csrf_token'] !== undefined && { csrfToken: cookies['_csrf_token'] }),
      cookies,
      createdAt: now,
      updatedAt: now,
    });
  }

  async logout(): Promise<void> {
    this.#session = null;
    this.#sessionLoaded = false;
    await this.#sessionStore?.delete();
  }

  async isAuthenticated(): Promise<boolean> {
    await this.#loadSession();
    if (!this.#session) return false;
    try {
      await this.#rawRequest('GET', '/api/v2/user/profile');
      return true;
    } catch {
      return false;
    }
  }

  getSession(): TickTickSession | null {
    return this.#session;
  }

  // ───────── Internal HTTP ─────────

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    await this.#ensureSession();
    try {
      return await this.#rawRequest<T>(method, path, body);
    } catch (err) {
      if (err instanceof TickTickApiError && this.#isAuthFailure(err)) {
        if (!this.#credentials) {
          throw new TickTickAuthError('Session expired. Please login again.');
        }
        try {
          await this.login();
        } catch {
          throw new TickTickAuthError('Re-authentication failed.');
        }
        return this.#rawRequest<T>(method, path, body);
      }
      throw err;
    }
  }

  async #rawRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.#baseUrl}${path}`;
    const response = await this.#fetchFn(url, {
      method,
      headers: {
        ...BASE_HEADERS,
        'x-device': this.#xDevice,
        'x-tz': this.#timeZone,
        ...this.#buildAuthHeaders(),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    // Merge cookies on every response to keep session alive
    const newCookies = parseCookies(response.headers);
    if (this.#session && Object.keys(newCookies).length > 0) {
      const updatedCsrfToken = newCookies['_csrf_token'] ?? this.#session.csrfToken;
      await this.#setSession({
        ...this.#session,
        token: newCookies['t'] ?? this.#session.token,
        ...(updatedCsrfToken !== undefined && { csrfToken: updatedCsrfToken }),
        cookies: mergeCookies(this.#session.cookies, newCookies),
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

    return response.json() as Promise<T>;
  }

  async #ensureSession(): Promise<void> {
    await this.#loadSession();
    if (!this.#session) {
      if (!this.#credentials) {
        throw new TickTickAuthError(
          'No active session. Call login() or provide credentials.',
        );
      }
      await this.login();
    }
  }

  async #loadSession(): Promise<void> {
    if (this.#sessionLoaded) return;
    this.#session = (await this.#sessionStore?.load()) ?? null;
    this.#sessionLoaded = true;
  }

  async #setSession(session: TickTickSession): Promise<void> {
    this.#session = session;
    this.#sessionLoaded = true;
    await this.#sessionStore?.save(session);
  }

  #buildAuthHeaders(): Record<string, string> {
    if (!this.#session) return {};
    return {
      'x-csrftoken': this.#session.csrfToken ?? '',
      cookie: serializeCookies(this.#session.cookies),
    };
  }

  #isAuthFailure(err: TickTickApiError): boolean {
    if (err.status === 401 || err.status === 403) return true;
    if (err.responseBody && typeof err.responseBody === 'object') {
      const body = err.responseBody as Record<string, unknown>;
      const code = typeof body['errorCode'] === 'string' ? body['errorCode'].toLowerCase() : '';
      const msg =
        typeof body['errorMessage'] === 'string' ? body['errorMessage'].toLowerCase() : '';
      return (
        code.includes('token') ||
        code.includes('auth') ||
        code.includes('login') ||
        msg.includes('login') ||
        msg.includes('auth')
      );
    }
    return false;
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
