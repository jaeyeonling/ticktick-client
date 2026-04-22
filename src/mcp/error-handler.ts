import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TickTickAuthError, TickTickApiError, TickTickError } from '../errors.js';

export function mapError(error: unknown): CallToolResult {
  if (error instanceof TickTickAuthError) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Authentication error: ${error.message}. Check TICKTICK_USERNAME and TICKTICK_PASSWORD environment variables.` }],
    };
  }

  if (error instanceof TickTickApiError) {
    const detail = error.status >= 500
      ? `TickTick server error (${error.status}): ${error.message}`
      : `API error (${error.status}): ${error.message}`;
    return {
      isError: true,
      content: [{ type: 'text', text: detail }],
    };
  }

  if (error instanceof TickTickError) {
    return {
      isError: true,
      content: [{ type: 'text', text: `TickTick error: ${error.message}` }],
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: 'text', text: `Unexpected error: ${message}` }],
  };
}

export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/**
 * Strip keys whose value is `undefined` so that the result satisfies
 * `exactOptionalPropertyTypes`. Zod optional fields produce `T | undefined`,
 * but the client types expect the key to be absent instead.
 *
 * The return type uses a mapped type to convert `T | undefined` properties
 * back to optional-without-undefined, matching the client's Draft types.
 */
export function stripUndefined<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T as undefined extends T[K] ? never : K]: T[K] } &
   { [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined> } {
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result as any;
}
