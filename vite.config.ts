import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-oxc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
  },
  build: {
    target: "esnext",
  },
  experimental:{
    enableNativePlugin: true,
  }
});
