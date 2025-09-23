import { afterAll, beforeAll, vi } from "vitest";

// 模拟 global fetch
const global = globalThis;
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = vi.fn();
});

afterAll(() => {
  global.fetch = originalFetch;
});
