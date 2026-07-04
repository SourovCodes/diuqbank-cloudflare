import { useEffect, useRef, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

/**
 * nprogress-style bar (like nextjs-toploader): trickles toward 90% while any
 * query or mutation is in flight, then snaps to 100% and fades out. Route
 * changes themselves are instant in a SPA, so query activity is the signal.
 */
export function TopLoader() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (active) {
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(resetTimer.current);
      setVisible(true);
      setProgress((p) => (p === 0 || p === 100 ? 8 : p));
      const trickle = window.setInterval(() => {
        setProgress((p) => Math.min(p + (90 - p) * 0.1, 90));
      }, 200);
      return () => window.clearInterval(trickle);
    }
    if (visible) {
      setProgress(100);
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        // Reset width only after the opacity fade finishes, so the bar fades
        // out at full width instead of vanishing.
        resetTimer.current = window.setTimeout(() => setProgress(0), 350);
      }, 400);
      return () => window.clearTimeout(hideTimer.current);
    }
  }, [active, visible]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-0.5 bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_8px_rgb(37_99_235/0.6)]"
        style={{
          width: `${progress}%`,
          // Snap back to 0 invisibly instead of animating the bar shrinking.
          transition: progress === 0 ? "none" : "width 200ms ease",
        }}
      />
    </div>
  );
}
