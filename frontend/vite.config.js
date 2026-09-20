import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend default port (server/index.js). Override with API_PROXY env if needed.
const API_TARGET = process.env.API_PROXY || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
  },
});