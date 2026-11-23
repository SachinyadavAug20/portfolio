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
  /** Where every filled cell links to — defaults to the GitHub calendar */
  href?: string;
}

const Heatmap = ({ days, showDayLabels = true, unit = "contribution", label, href }: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const heatRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const tipRef = useRef<HTMLDivElement>(null);
  /* Pad the leading edge so column 0 starts on a Sunday, matching GitHub. */
  const { cells, weekCount, monthMarks } = useMemo(() => {
    if (days.length === 0) return { cells: [], weekCount: 0, monthMarks: [] as { col: number; label: string }[] };
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
  /* Tooltip placement: above the cell when there's room (row ≥ 3), flipping
     below near the top edge so it never gets clipped by the box. */
  const tipLeft = hoverIdx != null ? Math.floor(hoverIdx / 7) * 12 + 5 - scrollX : 0;
  /* When scrolled, the ruler is NOT scrolled — so we shift each mark LEFT by
     the current scroll offset to compensate, keeping it visually aligned with
     the column it names. */
  const rulerLeft = (col: number) => Math.round(col * 12 - scrollX + 5);
  const tipTop =
    hoverIdx != null
      ? (hoverIdx % 7) >= 3
        ? (hoverIdx % 7) * 12 - 26
        : (hoverIdx % 7) * 12 + 8
      : 0;
  const CAL_URL = href ?? `https://github.com/users/${GITHUB_USER}/contributions`;

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

      /* Recent days get a gentle one-time fade — NOT an infinite loop, the
         calendar reads best static; hover already provides interactivity. */
      const recent = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(".hm-cell[data-filled]") ?? [],
      ).slice(-40);
      if (recent.length) {
        gsap.fromTo(
          recent,
          { opacity: 0 },
          {
            opacity: 1,
            delay: 0.45,
            duration: 0.5,
            stagger: 0.004,
            clearProps: "opacity",
            scrollTrigger: { trigger: rootRef.current, start: "top 82%", once: true },
          },
        );
      }
    },
    { scope: rootRef, dependencies: [reduced, mobile, cells.length], revertOnUpdate: true },
  );

  /* Tooltip entrance: scale-in with a bounce when hovering a cell. */
  useGSAP(
    () => {
      if (reduced) return;
      const tip = tipRef.current;
      if (!tip || !hovered) return;
      gsap.fromTo(
        tip,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.9)" },
      );
    },
    { scope: rootRef, dependencies: [hoverIdx, reduced, hovered], revertOnUpdate: true },
  );

  return (
    <div ref={rootRef} className="w-full">
      {/* month ruler — shares the cell grid's column widths via the same count */}
      <div className="flex">
        <div className={showDayLabels ? "w-7 shrink-0 sm:w-8" : "w-0"} />
        <div className="relative h-4 flex-1 min-w-0">
          {monthMarks.map((m) => (
            <span
              key={`${m.col}-${m.label}`}
              className="absolute top-0 text-[10px] leading-4 text-white-50/70"
              style={{ left: `${rulerLeft(m.col)}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-1 sm:gap-1.5">
        {showDayLabels && (
          <div className="grid w-7 shrink-0 grid-rows-7 gap-[3px] sm:w-8">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
              <span key={i} className="text-[9px] leading-[11px] text-white-50/60 text-right pr-1">
                {d}
              </span>
            ))}
          </div>
        )}

        <div
          className="overflow-x-auto pb-1 relative"
          ref={heatRef}
          onScroll={(e) => setScrollX((e.currentTarget as HTMLDivElement).scrollLeft)}
        >
          <div
            className="grid gap-[1.5px] sm:gap-[2px]"
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
                  href={CAL_URL}
                  target="_blank"
                  rel="noreferrer"
                  data-filled
                  className="hm-cell relative w-[10px] h-[10px] rounded-[2px]"
                  style={{ backgroundColor: `var(--gh-${cell.level})` }}
                  aria-label={`${cell.count} ${unit}${cell.count === 1 ? "" : "s"} on ${shortDate(cell.date)}`}
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

          {/* Bubble tooltip above the hovered cell — GSAP entrance +
              Framer-free placement; positioned from the cell's grid coords. */}
          <div
            ref={tipRef}
            className="absolute pointer-events-none z-20"
            style={{
              left: tipLeft,
              top: tipTop,
              opacity: hoverIdx != null ? 1 : 0,
            }}
          >
            {hovered && (
              <div className="whitespace-nowrap rounded-md border border-black-50 bg-black-100 px-2 py-1 text-[11px] text-white-50 shadow-sm translate-x-[-50%]">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: `var(--gh-${hovered.level})` }} />
                  <span className="font-semibold tabular-nums">{hovered.count}</span>
                  <span>{hovered.count === 1 ? unit : `${unit}s`}</span>
                  <span className="text-white-50/50">·</span>
                  <span>{shortDate(hovered.date)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Legend swatch row, shared by both cards. Links to the calendar it labels. */
export const HeatmapLegend = () => (
  <a
    href={`https://github.com/users/${GITHUB_USER}/contributions`}
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
