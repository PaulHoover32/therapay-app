import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [{ src: "manifest.json", dest: "." }],
    }),
  ],
  resolve: {
    alias: {
      "@therapay": path.resolve(__dirname, "../lib"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: "index.html",
        background: "background.ts",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
