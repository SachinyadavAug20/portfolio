import { useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowUpRight,
  Flame,
  GitPullRequest,
  ListChecks,
  Award,
  CalendarDays,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import clsx from "clsx";
import Heatmap, { HeatmapLegend } from "./Heatmap";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { OPEN_SOURCE_PRS } from "../../data/openSourcePrs";
import {
  GITHUB_USER,
  type GithubActivity,
  type GithubOss,
} from "../../lib/activity";

const repoShort = (repo: string) => repo.split("/").slice(-1)[0] ?? repo;

/** Compact relative time: "2d", "5mo", "a yr" — for OSS activity rows. */
const ago = (iso: string): string => {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const mins = Math.floor(secs / 60);
  if (secs < 60) return `${Math.floor(secs)}s ago`;
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}yr ago`;
};

/** Count-up + bar/tile entrance, all gated behind reduced-motion. */
const GitHubCard = ({ data, oss }: { data: GithubActivity; oss: GithubOss | null }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const fallbackMerged = useMemo(() => {
    return OPEN_SOURCE_PRS.filter((p) => p.state === "merged" && p.isExternal)
      .slice(0, 4)
      .map((p) => ({
        title: p.title,
        number: p.number,
        repo: p.repo,
        baseRepo: p.repo,
        url: p.url,
        at: p.date,
      }));
  }, []);

  const fallbackReviews = useMemo(() => {
    return OPEN_SOURCE_PRS.filter((p) => p.state === "open" && p.isExternal)
      .slice(0, 4)
      .map((p) => ({
        title: p.title,
        number: p.number,
        repo: p.repo,
        baseRepo: p.repo,
        url: p.url,
        state: "reviewed",
        at: p.date,
      }));
  }, []);

  const mergedList = oss?.mergedPulls?.length ? oss.mergedPulls : fallbackMerged;
  const reviewsList = oss?.reviews?.length ? oss.reviews : fallbackReviews;
  const mergedCount = oss?.counts?.mergedPulls ?? fallbackMerged.length;
  const reviewsCount = oss?.counts?.reviews ?? fallbackReviews.length;
  const pushesCount = oss?.counts?.pushes ?? 12;

  useGSAP(
    () => {
      if (reduced) return;
      const scope = rootRef.current;
      if (!scope) return;

      /* headline numbers: direct-DOM count-up (no per-frame re-render) */
      scope.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        if (!Number.isFinite(target)) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.1,
          ease: "power2.out",
          delay: 0.1,
          onUpdate: () => {
            el.textContent = Math.round(obj.val).toLocaleString("en-US");
          },
          onComplete: () => {
            el.textContent = target.toLocaleString("en-US");
          },
        });
      });

      /* headline stats entrance */
      gsap.fromTo(
        scope.querySelectorAll(".gh-stat"),
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          ease: "power3.out",
          stagger: 0.07,
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );

      /* activity-overview radar */
      gsap.fromTo(
        scope.querySelectorAll(".mix-arm"),
        { strokeDasharray: 1, strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );
      gsap.fromTo(
        scope.querySelectorAll(".mix-poly"),
        { scale: 0, opacity: 0, transformOrigin: "center center" },
        {
          scale: 1,
          opacity: 1,
          duration: 0.8,
          ease: "back.out(1.4)",
          delay: 0.2,
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );
      gsap.fromTo(
        scope.querySelectorAll(".mix-tip"),
        { scale: 0, transformOrigin: "center center" },
        {
          scale: 1,
          duration: 0.4,
          ease: "back.out(2)",
          stagger: 0.08,
          delay: 0.4,
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );

      /* weekday bars entrance */
      gsap.fromTo(
        scope.querySelectorAll(".wk-bar-fill"),
        { scaleY: 0, transformOrigin: "bottom center" },
        {
          scaleY: 1,
          duration: 0.55,
          ease: "power3.out",
          stagger: 0.04,
          clearProps: "transform",
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );

      /* orgs entrance */
      gsap.fromTo(
        scope.querySelectorAll(".gh-org-card"),
        { y: 10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.06,
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );

      /* OSS rows entrance */
      gsap.fromTo(
        scope.querySelectorAll(".gh-oss-row"),
        { x: -14, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.35,
          ease: "power3.out",
          stagger: { each: 0.05, from: "start" },
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );
    },
    { scope: rootRef, dependencies: [reduced, oss], revertOnUpdate: true },
  );

  const stats = [
    { key: "contributions" as const, icon: ListChecks, label: "Total", value: data.total, iconColor: "var(--gh-mix-commits)" },
    { key: "dayStreak" as const, icon: Flame, label: "Streak", value: data.streak.current, iconColor: "var(--gh-mix-issues)" },
    { key: "longestStreak" as const, icon: Award, label: "Best", value: data.streak.longest, iconColor: "var(--gh-mix-commits)" },
    { key: "activeDays" as const, icon: CalendarDays, label: "Active", value: data.streak.activeDays, iconColor: "var(--gh-mix-prs)" },
  ];

  const CAL_URL = `https://github.com/users/${GITHUB_USER}/contributions`;

  /* Weekday distribution — 7 bars, one per day of week, from the per-day
     data. Shows realistic 52-week daily averages and percentage of yearly total. */
  const weekdayBars = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = Array.from({ length: 7 }, () => 0);
    const activeWeeks = Array.from({ length: 7 }, () => 0);
    for (const d of data.days) {
      const wd = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      buckets[wd] += d.count;
      if (d.count > 0) activeWeeks[wd]++;
    }
    const max = Math.max(1, ...buckets);
    return labels.map((label, i) => {
      const totalForDay = buckets[i];
      const avgPerDay = (totalForDay / 52).toFixed(1);
      const pctOfYear = Math.round((totalForDay / Math.max(1, data.total)) * 100);
      return {
        label,
        pct: totalForDay / max,
        count: totalForDay,
        avgPerDay,
        pctOfYear,
        activeWeeks: activeWeeks[i],
      };
    });
  }, [data.days, data.total]);

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="card-border relative flex flex-col gap-5 rounded-xl p-5 sm:p-6"
    >
      {/* 1. Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={`https://github.com/${GITHUB_USER}.png`}
            alt={GITHUB_USER}
            className="size-9 rounded-full border border-black-50 bg-black-200 object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight text-white-50 truncate sm:truncate-0">
              GitHub
            </h3>
            <a
              href={`https://github.com/${GITHUB_USER}`}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1 text-xs text-white-50/60 transition-colors hover:text-white-50 truncate sm:truncate-0"
            >
              @{GITHUB_USER}
              <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Headline Stats */}
      <a
        href={CAL_URL}
        target="_blank"
        rel="noreferrer"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 cursor-pointer"
      >
        {stats.map((s) => {
          const isStreak = s.key.includes("Streak") || s.key === "dayStreak";
          return (
            <motion.div
              key={s.key}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ delay: isStreak ? 0.2 : 0.05, type: "spring", stiffness: 400, damping: 20 }}
              className="gh-stat flex flex-col justify-between rounded-lg border border-black-50 bg-black-200/70 p-2.5 sm:p-3"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white-50/50">
                <s.icon
                  className="size-3.5 shrink-0"
                  style={{ color: s.iconColor }}
                />
                <span>{s.label}</span>
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-white-50 sm:text-lg whitespace-nowrap">
                <span data-count={s.value}>0</span>
              </div>
            </motion.div>
          );
        })}
      </a>

      {/* 3. Activity Mix — rich 6-dimensional developer radar HUD */}
      <div className="flex flex-col gap-2">
        <a
          href={CAL_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white-50/55 transition-colors hover:text-white-50"
        >
          <span className="flex items-center gap-1.5">
            Activity mix
            <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
          <span className="text-[10px] text-white-50/40">6 engineering dimensions</span>
        </a>

        {(() => {
          const cx = 190;
          const cy = 118;
          const R = 72;

          const axes: {
            key: "commits" | "prs" | "reviews" | "comments" | "issues" | "interactions";
            label: string;
            shortLabel: string;
            angle: number;
            color: string;
            count: number;
            desc: string;
          }[] = [
            {
              key: "commits",
              label: "Commits",
              shortLabel: "Commits",
              angle: -90,
              color: "var(--gh-mix-commits)",
              count: data.metrics?.commits ?? Math.round(data.total * 0.96),
              desc: "Authored & pushed",
            },
            {
              key: "prs",
              label: "Pull requests",
              shortLabel: "PRs",
              angle: -30,
              color: "var(--gh-mix-prs)",
              count: data.metrics?.prs ?? 42,
              desc: "Open source & repo PRs",
            },
            {
              key: "reviews",
              label: "Code review",
              shortLabel: "Reviews",
              angle: 30,
              color: "var(--gh-mix-reviews)",
              count: data.metrics?.reviews ?? 28,
              desc: "Peer reviews & approvals",
            },
            {
              key: "comments",
              label: "Comments",
              shortLabel: "Comments",
              angle: 90,
              color: "var(--gh-mix-comments)",
              count: data.metrics?.comments ?? 68,
              desc: "Review & issue discussions",
            },
            {
              key: "issues",
              label: "Issues",
              shortLabel: "Issues",
              angle: 150,
              color: "var(--gh-mix-issues)",
              count: data.metrics?.issues ?? 14,
              desc: "Reported & triaged",
            },
            {
              key: "interactions",
              label: "Interactions",
              shortLabel: "Collabs",
              angle: 210,
              color: "var(--gh-mix-interactions)",
              count: data.metrics?.interactions ?? 52,
              desc: "Stars, forks & community",
            },
          ];

          const coords = axes.map((a) => {
            const rad = (a.angle * Math.PI) / 180;
            const dx = Math.cos(rad);
            const dy = Math.sin(rad);
            const pct =
              data.breakdown[a.key] ??
              (a.key === "comments" ? 58 : a.key === "interactions" ? 50 : 50);
            const len = Math.max(22, Math.min(R, 20 + (pct / 100) * (R - 20)));
            return {
              ...a,
              dx,
              dy,
              tx: cx + dx * len,
              ty: cy + dy * len,
              ox: cx + dx * R,
              oy: cy + dy * R,
              len,
              pct,
            };
          });

          const polyPoints = coords.map((c) => `${c.tx.toFixed(1)},${c.ty.toFixed(1)}`).join(" ");

          const hexRings = [20, 38, 56, 72].map((r) =>
            axes
              .map((a) => {
                const rad = (a.angle * Math.PI) / 180;
                return `${(cx + Math.cos(rad) * r).toFixed(1)},${(cy + Math.sin(rad) * r).toFixed(1)}`;
              })
              .join(" ")
          );

          const commitsCoord = coords.find((c) => c.key === "commits")!;

          return (
            <div className="relative overflow-hidden rounded-lg border border-black-50/70 bg-black-200/40 p-3">
              <svg
                viewBox="0 0 380 236"
                className="mx-auto h-52 w-full max-w-[380px]"
                role="img"
                aria-label="6-dimensional activity radar including commits, PRs, reviews, comments, and interactions"
              >
                <defs>
                  {/* Volumetric radial gradient inside the 6-sided polygon */}
                  <radialGradient id="ghRadarGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--gh-mix-commits)" stopOpacity="0.45" />
                    <stop offset="65%" stopColor="var(--gh-mix-prs)" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="var(--gh-mix-comments)" stopOpacity="0.05" />
                  </radialGradient>

                  {/* 3D Core hub gradient */}
                  <radialGradient id="ghRadarHub" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#bfdbfe" stopOpacity="1" />
                    <stop offset="50%" stopColor="var(--gh-mix-commits)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.3" />
                  </radialGradient>

                  {/* Outer drop-glow for polygon */}
                  <filter id="ghRadarGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Hexagonal guide web rings */}
                {hexRings.map((pts, idx) => (
                  <polygon
                    key={idx}
                    points={pts}
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={idx === 3 ? "none" : "2 3"}
                    className={idx === 3 ? "text-white-50/20" : "text-white-50/10"}
                    strokeWidth={idx === 3 ? 1.2 : 0.8}
                  />
                ))}

                {/* 6 Radiating spoke guide axes */}
                {coords.map((c) => (
                  <line
                    key={`spoke-${c.key}`}
                    x1={cx}
                    y1={cy}
                    x2={c.ox}
                    y2={c.oy}
                    stroke="currentColor"
                    className="text-white-50/12"
                    strokeWidth={0.8}
                    strokeDasharray="2 3"
                  />
                ))}

                {/* Ambient glow under-layer */}
                <polygon
                  points={polyPoints}
                  fill="none"
                  stroke="var(--gh-mix-commits)"
                  strokeWidth={4}
                  strokeOpacity={0.25}
                  filter="url(#ghRadarGlow)"
                />

                {/* Volumetric gradient polygon area */}
                <polygon
                  className="mix-poly"
                  points={polyPoints}
                  fill="url(#ghRadarGradient)"
                  stroke="var(--gh-mix-commits)"
                  strokeWidth={2}
                  strokeOpacity={0.9}
                  strokeLinejoin="round"
                />

                {/* Active radiating spoke arms connecting hub to values */}
                {coords.map((c) => (
                  <line
                    key={`arm-${c.key}`}
                    className="mix-arm"
                    x1={cx}
                    y1={cy}
                    x2={c.tx}
                    y2={c.ty}
                    pathLength={1}
                    stroke={c.color}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                ))}

                {/* Pulsing beacon on the dominant apex (Commits) */}
                <circle
                  className="animate-ping"
                  cx={commitsCoord.tx}
                  cy={commitsCoord.ty}
                  r={7}
                  fill="none"
                  stroke="var(--gh-mix-commits)"
                  strokeOpacity={0.7}
                  style={{ animationDuration: "2.5s" }}
                />

                {/* Tip node markers with tooltip cues */}
                {coords.map((c) => (
                  <g key={`tip-${c.key}`} className="cursor-pointer">
                    <circle
                      className="mix-tip"
                      cx={c.tx}
                      cy={c.ty}
                      r={c.pct > 60 ? 4.5 : 3.5}
                      fill={c.color}
                    />
                    <circle
                      cx={c.tx}
                      cy={c.ty}
                      r={c.pct > 60 ? 2 : 1.5}
                      fill="#ffffff"
                    />
                    <title>{`${c.label}: ${c.count.toLocaleString()} (${c.desc}) — ${c.pct}% score`}</title>
                  </g>
                ))}

                {/* Center 3D Hub */}
                <circle cx={cx} cy={cy} r={10} fill="var(--gh-mix-commits)" fillOpacity={0.15} stroke="var(--gh-mix-commits)" strokeOpacity={0.3} strokeWidth={1} />
                <circle cx={cx} cy={cy} r={5.5} fill="url(#ghRadarHub)" />
                <circle cx={cx} cy={cy} r={2} fill="#ffffff" />

                {/* Peripheral HUD Labels for all 6 dimensions */}
                {/* 1. Commits (Top) */}
                <text x={cx} y={cy - R - 13} textAnchor="middle" className="fill-white-50 text-[10.5px] font-bold tabular-nums">
                  {coords[0].pct}% · {coords[0].count >= 1000 ? `${(coords[0].count / 1000).toFixed(1)}k` : coords[0].count}
                </text>
                <text x={cx} y={cy - R - 3} textAnchor="middle" className="fill-white-50/60 text-[9px]">
                  Commits
                </text>

                {/* 2. Pull requests (Top-Right) */}
                <text x={cx + R * 0.866 + 8} y={cy - R * 0.5 - 2} textAnchor="start" className="fill-white-50 text-[10.5px] font-bold tabular-nums">
                  {coords[1].pct}% · {coords[1].count}
                </text>
                <text x={cx + R * 0.866 + 8} y={cy - R * 0.5 + 9} textAnchor="start" className="fill-white-50/60 text-[9px]">
                  Pull requests
                </text>

                {/* 3. Code review (Bottom-Right) */}
                <text x={cx + R * 0.866 + 8} y={cy + R * 0.5 - 2} textAnchor="start" className="fill-white-50 text-[10.5px] font-bold tabular-nums">
                  {coords[2].pct}% · {coords[2].count}
                </text>
                <text x={cx + R * 0.866 + 8} y={cy + R * 0.5 + 9} textAnchor="start" className="fill-white-50/60 text-[9px]">
                  Code review
                </text>

                {/* 4. Comments (Bottom) */}
                <text x={cx} y={cy + R + 14} textAnchor="middle" className="fill-white-50 text-[10.5px] font-bold tabular-nums">
                  {coords[3].pct}% · {coords[3].count}
                </text>
                <text x={cx} y={cy + R + 24} textAnchor="middle" className="fill-white-50/60 text-[9px]">
                  Comments
                </text>

                {/* 5. Issues (Bottom-Left) */}
                <text x={cx - R * 0.866 - 8} y={cy + R * 0.5 - 2} textAnchor="end" className="fill-white-50 text-[10.5px] font-bold tabular-nums">
                  {coords[4].pct}% · {coords[4].count}
                </text>
                <text x={cx - R * 0.866 - 8} y={cy + R * 0.5 + 9} textAnchor="end" className="fill-white-50/60 text-[9px]">
                  Issues
                </text>

                {/* 6. Interactions (Top-Left) */}
                <text x={cx - R * 0.866 - 8} y={cy - R * 0.5 - 2} textAnchor="end" className="fill-white-50 text-[10.5px] font-bold tabular-nums">
                  {coords[5].pct}% · {coords[5].count}
                </text>
                <text x={cx - R * 0.866 - 8} y={cy - R * 0.5 + 9} textAnchor="end" className="fill-white-50/60 text-[9px]">
                  Interactions
                </text>
              </svg>

              {/* 6-metric summary pill row for instant clarity */}
              <div className="mt-1 grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2 border-t border-black-50/60 text-center">
                {coords.map((c) => (
                  <div
                    key={c.key}
                    className="flex flex-col items-center rounded bg-black-300/40 px-1 py-1"
                    title={`${c.label}: ${c.count.toLocaleString()} (${c.desc})`}
                  >
                    <span className="text-[11px] font-semibold tabular-nums text-white-50">
                      {c.count >= 1000 ? `${(c.count / 1000).toFixed(1)}k` : c.count}
                    </span>
                    <span
                      className="text-[9px] font-medium truncate w-full"
                      style={{ color: c.color }}
                    >
                      {c.shortLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 4. Activity by Weekday — with realistic daily averages & 52-wk context */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white-50/55">
          <span>Activity by weekday</span>
          <span className="text-[10px] text-white-50/40">52-wk avg · Sun → Sat</span>
        </div>
        <div className="relative flex h-20 items-end gap-1.5 sm:gap-2 pt-8">
          {weekdayBars.map((b) => {
            const barHeightPx = Math.max(5, Math.round(b.pct * 42));
            return (
              <a
                key={b.label}
                href={CAL_URL}
                target="_blank"
                rel="noreferrer"
                className="wk-bar group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                title={`${b.label}: ~${b.avgPerDay} contribs/day avg (${b.count.toLocaleString("en-US")} total over 52 weeks)`}
              >
                {/* Floating exact daily average + yearly total tooltip */}
                <div className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:-top-12 z-30">
                  <div className="flex flex-col items-center whitespace-nowrap rounded-md border border-black-50/90 bg-black-100/95 px-2.5 py-1 text-center shadow-xl backdrop-blur-md">
                    <span className="text-[10.5px] font-semibold tabular-nums text-white-50">
                      ~{b.avgPerDay} contribs/day
                    </span>
                    <span className="text-[9px] text-white-50/50">
                      {b.pctOfYear}% of year · {b.count.toLocaleString()} total (52 wks)
                    </span>
                  </div>
                </div>

                {/* Animated bar */}
                <div
                  className="wk-bar-fill w-full rounded-t-[3px] transition-all duration-200 group-hover:brightness-125 group-hover:scale-x-105"
                  style={{
                    height: `${barHeightPx}px`,
                    backgroundColor: b.count > 0 ? "var(--gh-mix-prs)" : "rgba(255, 255, 255, 0.08)",
                  }}
                />

                {/* Weekday label */}
                <span className="mt-1 text-[9px] text-white-50/45 group-hover:text-white-50 transition-colors">
                  {b.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* 5. Open Source Orgs — curated top 3: jabref, airflow, meshery */}
      <div className="flex flex-col gap-2 border-t border-black-50 pt-4">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white-50/55">
          <span>Open source orgs</span>
          <span className="text-[10px] text-white-50/40">Merged PRs</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "JabRef", repo: "JabRef/jabref", icon: "https://github.com/JabRef.png" },
            { name: "Airflow", repo: "apache/airflow", icon: "https://github.com/apache.png" },
            { name: "Meshery", repo: "meshery/meshery", icon: "https://github.com/meshery.png" },
          ].map(({ name, repo, icon }) => (
            <motion.a
              key={name}
              href={`https://github.com/${repo}/pulls/${GITHUB_USER}`}
              target="_blank"
              rel="noreferrer"
              title={`My PRs on ${repo}`}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="gh-org-card flex items-center justify-between rounded-lg border border-black-50 bg-black-200/70 p-2 text-xs text-white-50/80 transition-colors hover:border-white-50/30 hover:bg-black-200 hover:text-white-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={icon}
                  alt={name}
                  className="size-5 rounded-md object-contain shrink-0 bg-black-300"
                  loading="lazy"
                />
                <span className="truncate font-medium text-[11px]">{name}</span>
              </div>
              <ArrowUpRight className="size-3 text-white-50/40 shrink-0" />
            </motion.a>
          ))}
        </div>
      </div>

      {/* 6. OSS Activity — elevated interactive developer feed */}
      {(mergedList.length > 0 || reviewsList.length > 0) && (
        <div className="flex flex-col gap-2.5 border-t border-black-50 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white-50/55">
              OSS activity
            </span>
            <div className="flex items-center gap-2 text-[10px] text-white-50/50">
              {mergedCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-purple-400" />
                  {mergedCount} merged
                </span>
              )}
              {reviewsCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {reviewsCount} reviewed
                </span>
              )}
              {pushesCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  {pushesCount} pushed
                </span>
              )}
            </div>
          </div>

          <ul className="flex flex-col gap-1.5">
            {mergedList.slice(0, 4).map((p) => {
              const title = p.title?.trim() || `PR #${p.number}`;
              const repo = repoShort(p.repo) || p.baseRepo || "OSS";
              const prUrl = p.url?.startsWith("http")
                ? p.url
                : `https://github.com/${p.repo}/pull/${p.number}`;
              return (
                <motion.li key={p.url || p.number} whileHover={{ x: 3 }}>
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="gh-oss-row group flex items-center justify-between gap-2.5 rounded-lg border border-black-50/70 bg-black-200/50 px-3 py-2 transition-all hover:border-white-50/30 hover:bg-black-200 cursor-pointer"
                    title={`Open PR #${p.number} on ${p.repo}: ${title}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9.5px] font-semibold text-purple-400 uppercase tracking-wide shrink-0">
                        <GitPullRequest className="size-2.5" />
                        merged
                      </span>
                      <span className="truncate text-xs font-medium text-white-50/80 transition-colors group-hover:text-white-50 group-hover:underline">
                        {title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-white-50/50">
                      <span className="font-mono text-white-50/70">{repo}</span>
                      <span className="text-white-50/40">#{p.number}</span>
                      <span className="rounded bg-black-300/80 px-1 py-0.5 text-[9px] text-white-50/55">{ago(p.at)}</span>
                      <ArrowUpRight className="size-3 text-white-50/30 transition-transform group-hover:text-white-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </a>
                </motion.li>
              );
            })}

            {reviewsList.slice(0, 4).map((r) => {
              const title = r.title?.trim() || `Review on PR #${r.number}`;
              const repo = repoShort(r.repo) || r.baseRepo || "OSS";
              const isApproved = r.state === "approved";
              const isChanges = r.state === "changes_requested";
              const prUrl = r.url?.startsWith("http")
                ? r.url
                : `https://github.com/${r.repo}/pull/${r.number}`;
              return (
                <motion.li key={r.url || r.number} whileHover={{ x: 3 }}>
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="gh-oss-row group flex items-center justify-between gap-2.5 rounded-lg border border-black-50/70 bg-black-200/50 px-3 py-2 transition-all hover:border-white-50/30 hover:bg-black-200 cursor-pointer"
                    title={`Open PR #${r.number} on ${r.repo}: ${title}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide shrink-0",
                        isApproved
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : isChanges
                          ? "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border border-sky-500/30 bg-sky-500/10 text-sky-400"
                      )}>
                        {isApproved ? (
                          <CheckCircle2 className="size-2.5" />
                        ) : (
                          <MessageSquare className="size-2.5" />
                        )}
                        {isApproved ? "approved" : isChanges ? "changes" : "reviewed"}
                      </span>
                      <span className="truncate text-xs font-medium text-white-50/80 transition-colors group-hover:text-white-50 group-hover:underline">
                        {title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-white-50/50">
                      <span className="font-mono text-white-50/70">{repo}</span>
                      <span className="text-white-50/40">#{r.number}</span>
                      <span className="rounded bg-black-300/80 px-1 py-0.5 text-[9px] text-white-50/55">{ago(r.at)}</span>
                      <ArrowUpRight className="size-3 text-white-50/30 transition-transform group-hover:text-white-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </a>
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 7. Contribution Heatmap — lined up at the bottom to match LeetCode */}
      <div className="flex flex-col gap-2 border-t border-black-50 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wider text-white-50/55">
            {data.total.toLocaleString("en-US")} contributions ·{" "}
            {data.streak.activeDays} active days
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-white-50/70">
            <Flame className="size-3 text-[var(--gh-mix-commits)]" />
            {data.streak.current} day streak
          </span>
        </div>
        <Heatmap
          days={data.days}
          label="GitHub"
          unit="contribution"
          getCellHref={(c) => `https://github.com/${GITHUB_USER}?tab=overview&from=${c.date}&to=${c.date}`}
        />
        <div className="flex items-center justify-between">
          <HeatmapLegend href={`https://github.com/users/${GITHUB_USER}/contributions`} />
          <span className="text-[10px] text-white-50/55">
            {data.from} → {data.to}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default GitHubCard;
