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
     data. This adds a second dimension to the calendar. */
  const weekdayBars = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = Array.from({ length: 7 }, () => 0);
    for (const d of data.days) {
      const wd = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      buckets[wd] += d.count;
    }
    const max = Math.max(1, ...buckets);
    return labels.map((label, i) => ({ label, pct: buckets[i] / max, count: buckets[i] }));
  }, [data.days]);

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

      {/* 3. Activity Mix — rich dimensional radar HUD */}
      <div className="flex flex-col gap-2">
        <a
          href={CAL_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white-50/55 transition-colors hover:text-white-50"
        >
          Activity mix
          <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        {(() => {
          const cx = 170;
          const cy = 110;
          const R = 78;

          const axes: {
            key: "commits" | "reviews" | "issues" | "prs";
            label: string;
            dx: number;
            dy: number;
            color: string;
          }[] = [
            { key: "commits", label: "Commits", dx: -1, dy: 0, color: "var(--gh-mix-commits)" },
            { key: "reviews", label: "Code review", dx: 0, dy: -1, color: "var(--gh-mix-reviews)" },
            { key: "issues", label: "Issues", dx: 1, dy: 0, color: "var(--gh-mix-issues)" },
            { key: "prs", label: "Pull requests", dx: 0, dy: 1, color: "var(--gh-mix-prs)" },
          ];

          const coords = axes.map((a) => {
            const pct = data.breakdown[a.key];
            const len = Math.max(16, Math.min(R, 18 + (pct / 100) * (R - 18)));
            return { ...a, tx: cx + a.dx * len, ty: cy + a.dy * len, len, pct };
          });

          const polyPoints = coords.map((c) => `${c.tx.toFixed(1)},${c.ty.toFixed(1)}`).join(" ");

          const commitsCoord = coords.find((c) => c.key === "commits")!;
          const reviewsCoord = coords.find((c) => c.key === "reviews")!;
          const issuesCoord = coords.find((c) => c.key === "issues")!;
          const prsCoord = coords.find((c) => c.key === "prs")!;

          return (
            <div className="relative overflow-hidden rounded-lg border border-black-50/70 bg-black-200/40 p-3">
              <svg
                viewBox="0 0 340 220"
                className="mx-auto h-48 w-full max-w-[340px]"
                role="img"
                aria-label="Dimensional activity overview by type"
              >
                <defs>
                  {/* Volumetric radial gradient inside the polygon */}
                  <radialGradient id="ghRadarGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--gh-mix-commits)" stopOpacity="0.45" />
                    <stop offset="65%" stopColor="var(--gh-mix-commits)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--gh-mix-commits)" stopOpacity="0.04" />
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

                {/* Radar guide web rings */}
                {[20, 40, 60, 80].map((r, idx) => (
                  <circle
                    key={r}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={idx === 3 ? "none" : "2 3"}
                    className={idx === 3 ? "text-white-50/20" : "text-white-50/10"}
                    strokeWidth={idx === 3 ? 1.2 : 0.8}
                  />
                ))}

                {/* 4 Diagonal rays at 45°, 135°, 225°, 315° giving 8-axis web dimension */}
                <line x1={cx - 56.5} y1={cy - 56.5} x2={cx + 56.5} y2={cy + 56.5} stroke="currentColor" strokeDasharray="2 3" className="text-white-50/10" strokeWidth={0.8} />
                <line x1={cx - 56.5} y1={cy + 56.5} x2={cx + 56.5} y2={cy - 56.5} stroke="currentColor" strokeDasharray="2 3" className="text-white-50/10" strokeWidth={0.8} />

                {/* Primary cross axis lines */}
                <line x1={cx - 80} y1={cy} x2={cx + 80} y2={cy} stroke="currentColor" className="text-white-50/15" strokeWidth={1} />
                <line x1={cx} y1={cy - 80} x2={cx} y2={cy + 80} stroke="currentColor" className="text-white-50/15" strokeWidth={1} />

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

                {/* Active radiating spoke arms */}
                {coords.map((c) => (
                  <line
                    key={c.key}
                    className="mix-arm"
                    x1={cx}
                    y1={cy}
                    x2={c.tx}
                    y2={c.ty}
                    pathLength={1}
                    stroke={c.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                ))}

                {/* Pulsing beacon on the dominant tip (Commits) */}
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

                {/* Tip node markers */}
                {coords.map((c) => (
                  <g key={c.key}>
                    <circle
                      className="mix-tip"
                      cx={c.tx}
                      cy={c.ty}
                      r={c.pct > 50 ? 4.5 : 3.5}
                      fill={c.color}
                    />
                    <circle
                      cx={c.tx}
                      cy={c.ty}
                      r={c.pct > 50 ? 2 : 1.5}
                      fill="#ffffff"
                    />
                  </g>
                ))}

                {/* Center 3D Hub */}
                <circle cx={cx} cy={cy} r={10} fill="var(--gh-mix-commits)" fillOpacity={0.15} stroke="var(--gh-mix-commits)" strokeOpacity={0.3} strokeWidth={1} />
                <circle cx={cx} cy={cy} r={5.5} fill="url(#ghRadarHub)" />
                <circle cx={cx} cy={cy} r={2} fill="#ffffff" />

                {/* Perimeter HUD Labels */}
                {/* Left: Commits */}
                <text x={cx - R - 8} y={cy - 4} textAnchor="end" className="fill-white-50 text-[11px] font-bold tabular-nums">
                  {commitsCoord.pct}%
                </text>
                <text x={cx - R - 8} y={cy + 9} textAnchor="end" className="fill-white-50/60 text-[9.5px]">
                  Commits
                </text>

                {/* Right: Issues */}
                <text x={cx + R + 8} y={cy - 4} textAnchor="start" className="fill-white-50 text-[11px] font-bold tabular-nums">
                  {issuesCoord.pct}%
                </text>
                <text x={cx + R + 8} y={cy + 9} textAnchor="start" className="fill-white-50/60 text-[9.5px]">
                  Issues
                </text>

                {/* Top: Reviews */}
                <text x={cx} y={cy - R - 13} textAnchor="middle" className="fill-white-50 text-[11px] font-bold tabular-nums">
                  {reviewsCoord.pct}%
                </text>
                <text x={cx} y={cy - R - 2} textAnchor="middle" className="fill-white-50/60 text-[9.5px]">
                  Code review
                </text>

                {/* Bottom: Pull requests */}
                <text x={cx} y={cy + R + 14} textAnchor="middle" className="fill-white-50 text-[11px] font-bold tabular-nums">
                  {prsCoord.pct}%
                </text>
                <text x={cx} y={cy + R + 24} textAnchor="middle" className="fill-white-50/60 text-[9.5px]">
                  Pull requests
                </text>
              </svg>
            </div>
          );
        })()}
      </div>

      {/* 4. Activity by Weekday — with hover count tooltips */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white-50/55">
          <span>Activity by weekday</span>
          <span className="text-[10px] text-white-50/40">Sun → Sat</span>
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
                title={`${b.label}: ${b.count.toLocaleString("en-US")} contributions`}
              >
                {/* Floating exact count tooltip on hover */}
                <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:-top-7 z-30">
                  <div className="flex items-center gap-1 whitespace-nowrap rounded-md border border-black-50 bg-black-100/95 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white-50 shadow-xl backdrop-blur-md">
                    <span>{b.count.toLocaleString("en-US")}</span>
                    <span className="text-[8px] text-white-50/50">contribs</span>
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
      {oss && (oss.counts.mergedPulls > 0 || oss.counts.reviews > 0) && (
        <div className="flex flex-col gap-2.5 border-t border-black-50 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white-50/55">
              OSS activity
            </span>
            <div className="flex items-center gap-2 text-[10px] text-white-50/50">
              {oss.counts.mergedPulls > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-purple-400" />
                  {oss.counts.mergedPulls} merged
                </span>
              )}
              {oss.counts.reviews > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {oss.counts.reviews} reviewed
                </span>
              )}
              {oss.counts.pushes > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  {oss.counts.pushes} pushed
                </span>
              )}
            </div>
          </div>

          <ul className="flex flex-col gap-1.5">
            {oss.mergedPulls.slice(0, 4).map((p) => {
              const title = p.title?.trim() || `PR #${p.number}`;
              const repo = repoShort(p.repo) || p.baseRepo || "OSS";
              return (
                <motion.li
                  key={p.url}
                  whileHover={{ x: 3 }}
                  className="gh-oss-row group flex items-center justify-between gap-2.5 rounded-lg border border-black-50/70 bg-black-200/50 px-3 py-2 transition-all hover:border-white-50/20 hover:bg-black-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9.5px] font-semibold text-purple-400 uppercase tracking-wide shrink-0">
                      <GitPullRequest className="size-2.5" />
                      merged
                    </span>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs font-medium text-white-50/80 transition-colors group-hover:text-white-50 group-hover:underline"
                      title={title}
                    >
                      {title}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-white-50/50">
                    <span className="font-mono text-white-50/70">{repo}</span>
                    <span className="text-white-50/40">#{p.number}</span>
                    <span className="rounded bg-black-300/80 px-1 py-0.5 text-[9px] text-white-50/55">{ago(p.at)}</span>
                    <ArrowUpRight className="size-3 text-white-50/30 transition-transform group-hover:text-white-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </motion.li>
              );
            })}

            {oss.reviews.slice(0, 4).map((r) => {
              const title = r.title?.trim() || `Review on PR #${r.number}`;
              const repo = repoShort(r.repo) || r.baseRepo || "OSS";
              const isApproved = r.state === "approved";
              const isChanges = r.state === "changes_requested";
              return (
                <motion.li
                  key={r.url}
                  whileHover={{ x: 3 }}
                  className="gh-oss-row group flex items-center justify-between gap-2.5 rounded-lg border border-black-50/70 bg-black-200/50 px-3 py-2 transition-all hover:border-white-50/20 hover:bg-black-200"
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
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs font-medium text-white-50/80 transition-colors group-hover:text-white-50 group-hover:underline"
                      title={title}
                    >
                      {title}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[10px] text-white-50/50">
                    <span className="font-mono text-white-50/70">{repo}</span>
                    <span className="text-white-50/40">#{r.number}</span>
                    <span className="rounded bg-black-300/80 px-1 py-0.5 text-[9px] text-white-50/55">{ago(r.at)}</span>
                    <ArrowUpRight className="size-3 text-white-50/30 transition-transform group-hover:text-white-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
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
