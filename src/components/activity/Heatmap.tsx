import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { HeatmapDay } from "../../lib/activity";
import { GITHUB_USER } from "../../lib/activity";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format an ISO yyyy-mm-dd as "Mar 4" without timezone drift. */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/**
 * GitHub-style contribution grid: columns are weeks, rows are weekdays.
 * Cells are laid out with CSS grid (auto-flow column) so the DOM order is
 * chronological — that lets GSAP sweep the reveal left-to-right by week.
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
  /** Custom link generator per day */
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
  const mobile = useIsMobile();
  const heatRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

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

  /* Tooltip coordinates inside the scroll container.
     Clamped so it never overflows horizontally or gets clipped vertically. */
  const col = hoverIdx != null ? Math.floor(hoverIdx / 7) : 0;
  const row = hoverIdx != null ? hoverIdx % 7 : 0;
  const isBottomHalf = row >= 2;
  const rawLeft = col * 12 + 5;
  const tipLeft = Math.max(54, Math.min(weekCount * 12 - 54, rawLeft));
  /* Grid top starts at 24px (after month marks) */
  const cellY = 24 + row * 12;
  const tipTop = isBottomHalf ? cellY - 4 : cellY + 14;

  const defaultHref = href ?? `https://github.com/users/${GITHUB_USER}/contributions`;

  /* Scroll to the END by default: the leading edge is mostly empty, while the
     most recent (rightmost) week is the filled one worth seeing. Runs after
     mount AND on the next frame — layout isn't guaranteed settled yet. */
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

  useGSAP(
    () => {
      if (reduced) return;
      const nodes = rootRef.current?.querySelectorAll<HTMLElement>(".hm-cell[data-filled]");
      if (!nodes || nodes.length === 0) return;

      /* Spectacular wave reveal: cells pop up left-to-right (chronological,
         DOM order = week-by-week sweep) with a back.out bounce. */
      gsap.fromTo(
        nodes,
        { opacity: 0, scale: 0, transformOrigin: "center center" },
        {
          opacity: 1,
          scale: 1,
          duration: 0.35,
          ease: "back.out(1.6)",
          stagger: {
            each: mobile ? 0.0007 : 0.0004,
            from: "start",
            grid: "auto",
          },
          clearProps: "transform",
          scrollTrigger: { trigger: rootRef.current, start: "top 82%", once: true },
        },
      );
    },
    { scope: rootRef, dependencies: [reduced, mobile, cells.length], revertOnUpdate: true },
  );

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
          {/* Ruler + grid + tooltip share one scrolled, fixed-width wrapper so
              they move together — no scroll-compensation glitches. */}
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
              {cells.map((cell, i) =>
                cell ? (
                  <a
                    key={cell.date}
                    href={getCellHref ? getCellHref(cell) : defaultHref}
                    target="_blank"
                    rel="noreferrer"
                    data-filled
                    className="hm-cell relative block w-[10px] h-[10px] rounded-[2px] transition-transform duration-150 ease-out hover:scale-135 hover:z-20 hover:ring-1 hover:ring-white-50/40"
                    style={{ backgroundColor: `var(--gh-${cell.level})` }}
                    aria-label={`${cell.count} ${unit}${cell.count === 1 ? "" : "s"} on ${shortDate(cell.date)}`}
                    title={`${cell.count} ${unit}${cell.count === 1 ? "" : "s"} on ${shortDate(cell.date)}`}
                    onPointerEnter={() => setHoverIdx(i)}
                    onPointerLeave={() => setHoverIdx(null)}
                    onFocus={() => setHoverIdx(i)}
                    onBlur={() => setHoverIdx(null)}
                  />
                ) : (
                  <span key={`pad-${i}`} className="w-[10px] h-[10px] rounded-[2px] bg-black-200" />
                ),
              )}
            </div>

            {/* Bubble tooltip — cleanly positioned without clipping or layout lag */}
            {hovered && (
              <div
                className="pointer-events-none absolute z-30 transition-all duration-75 ease-out"
                style={{
                  left: `${tipLeft}px`,
                  top: `${tipTop}px`,
                  transform: isBottomHalf ? "translate(-50%, -100%)" : "translate(-50%, 0)",
                }}
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-black-50 bg-black-100/95 px-2.5 py-1 text-[11px] text-white-50 shadow-xl backdrop-blur-md">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: `var(--gh-${hovered.level})` }}
                  />
                  <span className="font-semibold tabular-nums">
                    {hovered.count}
                  </span>
                  <span>{hovered.count === 1 ? unit : `${unit}s`}</span>
                  <span className="text-white-50/40">·</span>
                  <span className="text-white-50/80">{shortDate(hovered.date)}</span>
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
      <span key={l} className="size-2.5 rounded-[2px]" style={{ backgroundColor: `var(--gh-${l})` }} />
    ))}
    <span>More</span>
  </a>
);

export default Heatmap;
