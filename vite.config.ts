import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
  },
  build: {
    target: "esnext",
  },
  experimental: {
    enableNativePlugin: true,
  },
  test: {
    globals: true,
    silent: false,
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 20000, // 设置全局超时时间为 20 秒
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
