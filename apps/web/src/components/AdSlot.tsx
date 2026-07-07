import { cx } from "../lib/cx";

/**
 * Placeholder / renderer for a manually-placed Google AdSense unit.
 *
 * Auto ads are turned OFF in the AdSense dashboard on purpose — every ad on the
 * site is a hand-placed slot rendered by this component so the layout stays
 * predictable (no content-shift when an ad fills, no ads dropped on top of the
 * PDF viewer, etc.).
 *
 * When `LIVE` is on, each slot with a filled-in `slot` id renders the real
 * `<ins class="adsbygoogle">` (with the correct markup for its `type`) via
 * `LiveAd`; any slot still missing an id falls back to a neutral, clearly-
 * labelled placeholder that reserves the ad's height so there is no layout
 * shift (CLS). The AdSense loader script is injected into index.html in
 * production builds only (see `googleTagsPlugin` in apps/web/vite.config.ts),
 * so nothing loads on the dev server or localhost — the dev preview shows
 * empty (height-reserved) `<ins>` boxes instead of live ads.
 *
 * To add a placement: create the ad unit in AdSense (its `type` is display /
 * in-feed / in-article / multiplex) and add an entry to `AD_UNITS` with its
 * `data-ad-slot` id — plus, for **in-feed** units, the `data-ad-layout-key`
 * string AdSense generates into `layoutKey`.
 */

// Master switch for rendering real ad units (vs. placeholders).
const LIVE = true;

// AdSense publisher id — kept in sync with VITE_ADSENSE_CLIENT_ID / the default
// in apps/web/vite.config.ts.
const AD_CLIENT = "ca-pub-4157128010679783";

/** The four AdSense unit types offered in the dashboard. */
type AdType = "display" | "in-feed" | "in-article" | "multiplex";

/** Reserved-space preset for the placeholder + live wrapper. */
type AdSize = "leaderboard" | "rectangle" | "feed" | "article" | "multiplex";

type AdUnit = {
  /** AdSense ad-unit id (`data-ad-slot`) — paste from the dashboard. */
  slot: string;
  type: AdType;
  size: AdSize;
  /** In-feed units only: the `data-ad-layout-key` AdSense generates. */
  layoutKey?: string;
};

/**
 * Named slots used across the site. `type` is the AdSense unit type to create
 * for each placement; `size` reserves the right amount of space.
 */
export type AdSlotName =
  | "home-inline"
  | "questions-list"
  | "question-below-viewer"
  | "question-sidebar"
  | "question-bottom"
  | "contributors-list";

const AD_UNITS: Record<AdSlotName, AdUnit> = {
  // "Display horizontal" banner unit.
  "home-inline": { slot: "9766668556", type: "display", size: "leaderboard" },
  // Shared in-feed unit (reused on the contributors list — different page, so
  // the same unit id appearing twice across the site is fine).
  "questions-list": { slot: "4676286761", type: "in-feed", size: "feed", layoutKey: "-gw-3+1f-3d+2z" },
  "question-below-viewer": { slot: "9433789424", type: "in-article", size: "article" },
  // "Sidebar" display unit.
  "question-sidebar": { slot: "9106486369", type: "display", size: "rectangle" },
  // End-of-content native recommendations grid on the question-detail page.
  "question-bottom": { slot: "5456839795", type: "multiplex", size: "multiplex" },
  "contributors-list": { slot: "4676286761", type: "in-feed", size: "feed", layoutKey: "-gw-3+1f-3d+2z" },
};

// Reserved size per preset. Heights match the common rendered sizes so the
// placeholder occupies roughly the space the real ad will.
const SIZE_META: Record<AdSize, { label: string; wrapper: string; minH: string }> = {
  leaderboard: { label: "728 × 90", wrapper: "mx-auto w-full max-w-3xl", minH: "min-h-[100px]" },
  rectangle: { label: "300 × 250", wrapper: "mx-auto w-full max-w-[300px]", minH: "min-h-[250px]" },
  feed: { label: "in-feed", wrapper: "w-full", minH: "min-h-[160px]" },
  article: { label: "in-article", wrapper: "mx-auto w-full max-w-3xl", minH: "min-h-[200px]" },
  multiplex: { label: "multiplex", wrapper: "w-full", minH: "min-h-[280px]" },
};

type AdSlotProps = {
  name: AdSlotName;
  /** Extra classes for the outer wrapper (e.g. spacing overrides). */
  className?: string;
};

export function AdSlot({ name, className }: AdSlotProps) {
  const unit = AD_UNITS[name];
  const meta = SIZE_META[unit.size];

  return (
    <div className={cx("my-8", meta.wrapper, className)}>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-widest text-gray-400 dark:text-gray-600">
        Advertisement
      </p>

      {LIVE && unit.slot ? (
        <LiveAd unit={unit} minH={meta.minH} />
      ) : (
        <div
          className={cx(
            "flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/60 text-center dark:border-gray-700 dark:bg-gray-900/40",
            meta.minH
          )}
          data-ad-slot={name}
          aria-hidden="true"
        >
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-600">
            Ad placeholder
          </span>
          <span className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-600">
            {name} · {unit.type}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Renders and activates a real AdSense unit with the correct `<ins>` attributes
 * for its type. Only mounted when `LIVE` is on and a `slot` id exists. Kept in
 * this file so wiring live ads is a one-place edit. The wrapper reserves the
 * unit's height so the fill does not shift layout.
 */
function LiveAd({ unit, minH }: { unit: AdUnit; minH: string }) {
  return (
    <div className={minH}>
      <InsForType unit={unit} />
    </div>
  );
}

function InsForType({ unit }: { unit: AdUnit }) {
  switch (unit.type) {
    case "in-feed":
      return (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={unit.slot}
          data-ad-format="fluid"
          data-ad-layout-key={unit.layoutKey}
          ref={pushAd}
        />
      );
    case "in-article":
      return (
        <ins
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center" }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={unit.slot}
          data-ad-layout="in-article"
          data-ad-format="fluid"
          ref={pushAd}
        />
      );
    case "multiplex":
      return (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={unit.slot}
          data-ad-format="autorelaxed"
          ref={pushAd}
        />
      );
    case "display":
    default:
      return (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={unit.slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
          ref={pushAd}
        />
      );
  }
}

// Pushes the unit to the adsbygoogle queue once it is in the DOM. Guarded so a
// missing loader (dev/localhost) is a no-op instead of a crash.
function pushAd(el: HTMLModElement | null) {
  if (!el) return;
  // Skip units whose container is hidden (e.g. the desktop-only sidebar unit on
  // mobile widths): pushing a 0-width responsive unit burns the slot and logs
  // an AdSense "availableWidth=0" error.
  if (el.offsetWidth === 0) return;
  try {
    const w = window as unknown as { adsbygoogle?: unknown[] };
    (w.adsbygoogle = w.adsbygoogle || []).push({});
  } catch {
    /* loader not present (dev/localhost) — ignore */
  }
}
