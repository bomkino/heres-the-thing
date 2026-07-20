import { defineConfig } from "vite";

export default defineConfig({
  server: { host: "127.0.0.1" },
  build: {
    outDir: "dist/client",
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 220,
  },
});
