import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { HeatmapDay } from "../../lib/activity";
import { GITHUB_USER } from "../../lib/activity";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format an ISO yyyy-mm-dd as "Mar 4, 2026" without timezone drift. */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/**
 * Animated Contribution Heatmap Skeleton
 * Renders a full 52-week calendar with month & weekday headers and an organic
 * wave shimmer pattern so the card NEVER looks dead or blank while loading.
 */
export const HeatmapSkeleton = ({
  unit = "contribution",
  label = "Activity",
  showDayLabels = true,
}: {
  unit?: string;
  label?: string;
  showDayLabels?: boolean;
}) => {
  const weeks = 52;
  const days = 7;
  const skeletonMonths = [
    { col: 0, label: "Jan" },
    { col: 4, label: "Feb" },
    { col: 8, label: "Mar" },
    { col: 13, label: "Apr" },
    { col: 17, label: "May" },
    { col: 21, label: "Jun" },
    { col: 26, label: "Jul" },
    { col: 30, label: "Aug" },
    { col: 35, label: "Sep" },
    { col: 39, label: "Oct" },
    { col: 43, label: "Nov" },
    { col: 48, label: "Dec" },
  ];

  return (
    <div className="w-full select-none" aria-label={`Loading ${label} ${unit} heatmap`}>
      <div className="flex gap-1 sm:gap-1.5">
        {showDayLabels && (
          <div className="grid w-7 shrink-0 grid-rows-7 gap-[2px] pt-6 sm:w-8">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              <span key={i} className="text-[9px] leading-[10px] text-white-50/40 text-right pr-1 select-none">
                {d}
              </span>
            ))}
          </div>
        )}

        <div className="overflow-x-auto pb-1 overscroll-contain">
          <div className="relative w-max pt-6">
            <div className="absolute top-1 left-0 h-4 pointer-events-none">
              {skeletonMonths.map((m) => (
                <span
                  key={`${m.col}-${m.label}`}
                  className="absolute top-0 text-[10px] leading-4 text-white-50/40"
                  style={{ left: `${m.col * 12}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div
              className="grid gap-[2px]"
              style={{
                gridTemplateColumns: `repeat(${weeks}, 10px)`,
                gridTemplateRows: "repeat(7, 10px)",
                gridAutoFlow: "column",
              }}
            >
              {Array.from({ length: weeks * days }).map((_, idx) => {
                const colIdx = Math.floor(idx / 7);
                const rowIdx = idx % 7;
                // Organic deterministic activity pattern
                const seed = (colIdx * 17 + rowIdx * 11) % 19;
                const isLit = seed > 6;
                const tier = seed > 15 ? 3 : seed > 11 ? 2 : seed > 6 ? 1 : 0;
                const delays = (colIdx * 0.03).toFixed(2);

                return (
                  <span
                    key={idx}
                    className="relative block w-[10px] h-[10px] rounded-[2px] border border-black-50/30 transition-all animate-pulse"
                    style={{
                      animationDelay: `${delays}s`,
                      animationDuration: "1.8s",
                      backgroundColor: isLit
                        ? tier === 3
                          ? "rgba(59, 130, 246, 0.40)"
                          : tier === 2
                          ? "rgba(59, 130, 246, 0.24)"
                          : "rgba(59, 130, 246, 0.14)"
                        : "var(--gh-0)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * GitHub-style contribution grid: columns are weeks, rows are weekdays.
 * Cells are laid out with CSS grid (auto-flow column) so the DOM order is
 * chronological. Each cell links directly to that day's activity timeline.
 */
interface Props {
  days: HeatmapDay[];
  /** Renders the Mon/Wed/Fri gutter (GitHub card has room, the compact one doesn't) */
  showDayLabels?: boolean;
  /** What one filled cell represents, e.g. "contribution" / "submission" */
  unit?: string;
  /** ARIA label prefix for the grid, e.g. "LeetCode submissions" */
  label: string;
  /** Where filled cells link to if getCellHref is not provided */
  href?: string;
  /** Custom link generator per day to that day's activity */
  getCellHref?: (cell: HeatmapDay) => string;
}

const Heatmap = ({
  days,
  showDayLabels = true,
  unit = "contribution",
  label,
  href,
  getCellHref,
}: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const heatRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipWidth, setTooltipWidth] = useState(0);

  /* Measure the tooltip width when it mounts so we can clamp it inside the
     calendar and never let its text run off the left/right edge. Re-measure
     on window resize in case the font/zoom changes. */
  const setTooltipRef = useCallback((el: HTMLDivElement | null) => {
    tooltipRef.current = el;
    if (el) setTooltipWidth(el.getBoundingClientRect().width);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (tooltipRef.current) setTooltipWidth(tooltipRef.current.getBoundingClientRect().width);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Pad the leading edge so column 0 starts on a Sunday, matching GitHub. */
  const { cells, weekCount, monthMarks } = useMemo(() => {
    if (days.length === 0)
      return {
        cells: [],
        weekCount: 0,
        monthMarks: [] as { col: number; label: string }[],
      };
    const first = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
    const padded: (HeatmapDay | null)[] = Array.from({ length: first }, () => null);
    padded.push(...days);
    while (padded.length % 7 !== 0) padded.push(null);

    const weeks = padded.length / 7;
    const marks: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const head = padded[w * 7];
      if (!head) continue;
      const month = new Date(`${head.date}T00:00:00Z`).getUTCMonth();
      if (month !== lastMonth) {
        marks.push({ col: w, label: MONTHS[month] });
        lastMonth = month;
      }
    }
    return { cells: padded, weekCount: weeks, monthMarks: marks };
  }, [days]);

  const hovered = hoverIdx != null ? cells[hoverIdx] : null;

  /* Tooltip coordinates inside the scroll container */
  const col = hoverIdx != null ? Math.floor(hoverIdx / 7) : 0;
  const row = hoverIdx != null ? hoverIdx % 7 : 0;
  const isBottomHalf = row >= 2;
  const rawLeft = col * 12 + 5;
  const cellY = 24 + row * 12;
  const tipTop = isBottomHalf ? cellY - 6 : cellY + 16;

  /* Clamp horizontally so the tooltip never spills past the calendar's
     left or right edge (same idea as the vertical clamp). Content width
     is weekCount * 12px since each cell column is 10px + 2px gap. */
  const contentWidth = weekCount * 12;
  const halfTip = tooltipWidth / 2 || 90; // fall back to an estimate before first measure
  const pad = 10;
  const minLeft = halfTip + pad;
  const maxLeft = Math.max(minLeft + 1, contentWidth - halfTip - pad);
  const tipLeft = Math.max(minLeft, Math.min(maxLeft, rawLeft));

  const defaultHref = href ?? `https://github.com/users/${GITHUB_USER}/contributions`;

  /* Scroll to the END by default: the leading edge is older, while the
     most recent (rightmost) week is the filled one worth seeing. */
  useLayoutEffect(() => {
    const el = heatRef.current;
    if (!el) return;
    const scroll = () => {
      el.scrollLeft = el.scrollWidth;
    };
    scroll();
    const raf = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(raf);
  }, [cells.length, weekCount]);

  /* Smooth reveal that does not mutate individual cell inline properties */
  useGSAP(
    () => {
      if (reduced || !rootRef.current) return;
      gsap.from(rootRef.current, {
        opacity: 0.25,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 95%", once: true },
      });
    },
    { scope: rootRef, dependencies: [reduced, cells.length], revertOnUpdate: true },
  );

  if (days.length === 0) {
    return <HeatmapSkeleton unit={unit} label={label} showDayLabels={showDayLabels} />;
  }

  return (
    <div ref={rootRef} className="w-full">
      <div className="flex gap-1 sm:gap-1.5">
        {showDayLabels && (
          <div className="grid w-7 shrink-0 grid-rows-7 gap-[2px] pt-6 sm:w-8">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              <span key={i} className="text-[9px] leading-[10px] text-white-50/60 text-right pr-1 select-none">
                {d}
              </span>
            ))}
          </div>
        )}

        <div
          className="overflow-x-auto pb-1 overscroll-contain select-none"
          data-lenis-prevent="true"
          ref={heatRef}
        >
          {/* Ruler + grid + tooltip share one scrolled, fixed-width wrapper */}
          <div className="relative w-max pt-6">
            <div className="absolute top-1 left-0 h-4 pointer-events-none">
              {monthMarks.map((m) => (
                <span
                  key={`${m.col}-${m.label}`}
                  className="absolute top-0 text-[10px] leading-4 text-white-50/70"
                  style={{ left: `${m.col * 12}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div
              className="grid gap-[2px]"
              style={{
                gridTemplateColumns: `repeat(${weekCount}, 10px)`,
                gridTemplateRows: "repeat(7, 10px)",
                gridAutoFlow: "column",
              }}
              role="group"
              aria-label={`${label} ${unit} heatmap`}
            >
              {cells.map((cell, i) => {
                if (!cell) {
                  return <span key={`pad-${i}`} className="w-[10px] h-[10px] rounded-[2px] bg-black-200/40" />;
                }

                const targetUrl = getCellHref ? getCellHref(cell) : defaultHref;
                const hasContrib = cell.count > 0 || cell.level > 0;
                const effectiveLevel = cell.level > 0 ? cell.level : hasContrib ? 1 : 0;

                return (
                  <a
                    key={cell.date}
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-level={effectiveLevel}
                    className={`hm-cell relative block w-[10px] h-[10px] rounded-[2px] transition-transform duration-150 ease-out hover:scale-140 hover:z-20 hover:ring-1 hover:ring-white-50/60 ${
                      hasContrib
                        ? "border border-blue-400/35 shadow-[0_0_2px_rgba(59,130,246,0.3)]"
                        : "border border-black-50/40"
                    }`}
                    style={{ backgroundColor: `var(--gh-${effectiveLevel})` }}
                    aria-label={`${cell.count} ${unit}${cell.count === 1 ? "" : "s"} on ${shortDate(cell.date)} — click to view day's activity`}
                    title={`${cell.count} ${unit}${cell.count === 1 ? "" : "s"} on ${shortDate(cell.date)}`}
                    onPointerEnter={() => setHoverIdx(i)}
                    onPointerLeave={() => setHoverIdx(null)}
                    onFocus={() => setHoverIdx(i)}
                    onBlur={() => setHoverIdx(null)}
                  />
                );
              })}
            </div>

            {/* Bubble tooltip with click cue */}
            {hovered && (
              <div
                ref={setTooltipRef}
                className="pointer-events-none absolute z-30 transition-all duration-75 ease-out"
                style={{
                  left: `${tipLeft}px`,
                  top: `${tipTop}px`,
                  transform: isBottomHalf ? "translate(-50%, -100%)" : "translate(-50%, 0)",
                }}
              >
                <div className="flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-black-50/90 bg-black-200/95 px-2.5 py-1.5 text-[11px] text-white-50 shadow-2xl">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: `var(--gh-${hovered.level})` }}
                    />
                    <span className="font-semibold tabular-nums text-white-50">
                      {hovered.count}
                    </span>
                    <span className="text-white-50/80">{hovered.count === 1 ? unit : `${unit}s`}</span>
                    <span className="text-white-50/40">·</span>
                    <span className="text-white-50/90 font-medium">{shortDate(hovered.date)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9.5px] text-blue-400 font-medium pt-0.5">
                    <span>Click to view day&apos;s activity</span>
                    <ArrowUpRight className="size-2.5 shrink-0" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Legend swatch row, shared by both cards. Links to the calendar/profile it labels. */
export const HeatmapLegend = ({ href }: { href?: string }) => (
  <a
    href={href ?? `https://github.com/users/${GITHUB_USER}/contributions`}
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-1.5 text-[10px] text-white-50/70 transition-colors hover:text-white-50"
  >
    <span>Less</span>
    {[0, 1, 2, 3, 4].map((l) => (
      <span
        key={l}
        className="size-2.5 rounded-[2px]"
        style={{
          backgroundColor: `var(--gh-${l})`,
          border: l === 0 ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(59, 130, 246, 0.5)",
          boxShadow: l > 0 ? "0 0 3px rgba(59, 130, 246, 0.3)" : "none",
        }}
      />
    ))}
    <span>More</span>
  </a>
);

export default Heatmap;
