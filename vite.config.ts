import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Acres Ireland - 3D Model Viewer",
        short_name: "Acres Ireland",
        description: "AR Landscape Actions Viewer",
        theme_color: "#0a1628",
        background_color: "#0a1628",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "./pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "./pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /\/storage\/v1\/object\/public\/(models|thumbnails|exports)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "model-assets",
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
