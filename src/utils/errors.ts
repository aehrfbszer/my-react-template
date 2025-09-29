export class HttpError extends Error {
  #status: number;

  constructor(status: number, message: string, originalError?: unknown) {
    super(message, { cause: originalError });
    this.name = "HttpError";
    this.#status = status;
  }

  get status() {
    return this.#status;
  }
}
