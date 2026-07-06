import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends a GA4 `page_view` on every client-side navigation. The gtag loader is
 * injected into index.html at build time (see vite.config.ts) with
 * `send_page_view:false`, so this component owns every page_view — including
 * the initial load — and nothing is double counted. There is no gtag on the
 * dev server (the loader is build-only), so this is a no-op in development.
 */
export function RouteAnalytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: pathname + search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
}
