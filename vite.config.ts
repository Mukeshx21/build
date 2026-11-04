import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), landAiBackendPlugin()],
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "8443"),
    strictPort: true,
    proxy: apiProxy(),
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "8443"),
    proxy: apiProxy(),
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three/')) {
            return 'three-core';
          }
          if (id.includes('@react-three/fiber') || id.includes('@react-three/drei')) {
            return 'three-fiber';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons';
          }
        }
      }
    }
  },
}))

function apiProxy() {
  return {
    "/api/ocr": {
      target: process.env.VITE_OCR_API_URL || "http://127.0.0.1:8000",
      changeOrigin: true,
      secure: false,
    },
    "/api": {
      target: `http://127.0.0.1:${process.env.BACKEND_PORT || "5000"}`,
      changeOrigin: true,
      secure: false,
    },
  }
}

function landAiBackendPlugin(): Plugin {
  return {
    name: "landai-backend-plugin",
    async configureServer(server) {
      try {
        const { default: app } = await import("./server/app.js")
        server.middlewares.use(app)
      } catch (error) {
        console.error("Failed to mount LandAI API middleware in Vite:", error)
      }
    },
  }
}
