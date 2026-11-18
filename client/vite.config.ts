import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173, allowedHosts: [".devtunnels.ms", ".inc1.devtunnels.ms"], proxy: { "/api": "http://localhost:4000" } },
  build: { rollupOptions: { output: { manualChunks: { react: ["react", "react-dom"], icons: ["lucide-react"], monaco: ["@monaco-editor/react"] } } } },
});
