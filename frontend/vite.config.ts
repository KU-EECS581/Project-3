import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@api": resolve(__dirname, "./src/api"),
      "@components": resolve(__dirname, "./src/components"),
      "@models": resolve(__dirname, "./src/models"),
      "@styles": resolve(__dirname, "./src/styles"),
      "~middleware": resolve(__dirname, "../middleware"),
      // Ensure zod resolves from frontend's node_modules when imported from middleware
      "zod": resolve(__dirname, "./node_modules/zod")
    }
  },
  optimizeDeps: {
    include: ['zod']
  }
})
