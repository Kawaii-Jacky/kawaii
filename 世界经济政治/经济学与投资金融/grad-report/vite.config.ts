import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react(), viteSingleFile()],
  build: {
    // 全部资源（含 KaTeX woff2 字体、SVG）base64 内联进单个 HTML
    assetsInlineLimit: () => true,
    chunkSizeWarningLimit: 100000,
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
