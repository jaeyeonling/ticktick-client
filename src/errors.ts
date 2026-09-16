export class TickTickError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TickTickError';
  }
}

export class TickTickAuthError extends TickTickError {
  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message);
    this.name = 'TickTickAuthError';
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export class TickTickApiError extends TickTickError {
  constructor(
    message: string,
    readonly url: string,
    readonly method: string,
    readonly status: number,
    readonly responseBody: unknown,
  ) {
    super(message);
    this.name = 'TickTickApiError';
  }
}
