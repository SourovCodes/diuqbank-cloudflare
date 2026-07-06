import { defineConfig, loadEnv, type HtmlTagDescriptor, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DEFAULT_API_ORIGIN = "https://api.diuqbank.com";

// Public Google tag IDs. These ship in the client bundle, so they are not
// secrets — kept here (with env overrides) so the production build is
// self-contained even though `.env.production` is gitignored. Override per
// environment with VITE_GA_MEASUREMENT_ID / VITE_ADSENSE_CLIENT_ID.
const DEFAULT_GA_MEASUREMENT_ID = "G-QPKSEMRTZ2";
const DEFAULT_ADSENSE_CLIENT_ID = "ca-pub-4157128010679783";

// Injects the Google Analytics (gtag) and AdSense loader scripts into
// index.html. `apply: "build"` means this runs only for `vite build`, so the
// dev server and localhost never load analytics or ads (keeps GA data clean
// and avoids AdSense invalid-traffic flags). Route-change page_views are sent
// by <RouteAnalytics> (see src/components/RouteAnalytics.tsx).
function googleTagsPlugin(env: Record<string, string>): PluginOption {
  const gaId = (env.VITE_GA_MEASUREMENT_ID || DEFAULT_GA_MEASUREMENT_ID).trim();
  const adsenseClient = (
    env.VITE_ADSENSE_CLIENT_ID || DEFAULT_ADSENSE_CLIENT_ID
  ).trim();

  return {
    name: "diuqbank-google-tags",
    apply: "build",
    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];

      if (gaId) {
        tags.push({
          tag: "script",
          attrs: {
            async: true,
            src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
          },
          injectTo: "head",
        });
        tags.push({
          tag: "script",
          // send_page_view:false — <RouteAnalytics> sends one page_view per SPA
          // navigation (including the first), so the initial load is counted
          // exactly once.
          children:
            "window.dataLayer=window.dataLayer||[];" +
            "function gtag(){dataLayer.push(arguments);}" +
            "gtag('js',new Date());" +
            `gtag('config','${gaId}',{send_page_view:false});`,
          injectTo: "head",
        });
      }

      if (adsenseClient) {
        tags.push({
          tag: "script",
          attrs: {
            async: true,
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`,
            crossorigin: "anonymous",
          },
          injectTo: "head",
        });
      }

      return tags;
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const apiProxyTarget = env.VITE_DEV_API_PROXY_TARGET || DEFAULT_API_ORIGIN;

  return {
    plugins: [react(), tailwindcss(), googleTagsPlugin(env)],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
})
