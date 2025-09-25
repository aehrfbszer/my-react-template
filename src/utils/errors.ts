export class HttpError extends Error {
  #status: number;
  #originalError?: unknown;

  constructor(status: number, message: string, originalError?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.#status = status;
    this.#originalError = originalError;
  }

  get status() {
    return this.#status;
  }

  get originalError() {
    return this.#originalError;
  }
}

export class TokenError extends Error {
  #originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'TokenError';
    this.#originalError = originalError;
  }

  get originalError() {
    return this.#originalError;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}