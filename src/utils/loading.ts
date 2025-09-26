export interface LoadingFunction {
  start?: () => void;
  finish?: () => void;
  error?: () => void;
}

export class LoadingManager {
  #count = 0;
  #loadingFunction: LoadingFunction | null;

  constructor(loadingFunction: LoadingFunction | null = null) {
    this.#loadingFunction = loadingFunction;
  }

  setLoadingFunction(fn: LoadingFunction) {
    this.#loadingFunction = fn;
  }

  start() {
    this.#count++;
    if (this.#count === 1) {
      this.#loadingFunction?.start?.();
    }
  }

  finish() {
    if (this.#count > 0) {
      this.#count--;
    }
    if (this.#count === 0) {
      this.#loadingFunction?.finish?.();
    }
  }

  error() {
    if (this.#count === 0) {
      this.#loadingFunction?.error?.();
    }
  }

  get isActive() {
    return this.#count > 0;
  }
}
