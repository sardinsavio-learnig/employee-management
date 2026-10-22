import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.API_PROXY_TARGET || "http://backend:3000";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true
      }
    }
  },

  preview: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
});
