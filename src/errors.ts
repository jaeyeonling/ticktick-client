export class TickTickError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TickTickError';
  }
}

export class TickTickAuthError extends TickTickError {
  constructor(message: string) {
    super(message);
    this.name = 'TickTickAuthError';
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
