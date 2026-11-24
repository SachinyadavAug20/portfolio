import { useMemo, useRef, useState } from "react";
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
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

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
    { key: "contributions" as const, icon: ListChecks, label: "Total", value: data.total, iconColor: "var(--gh-mix-commits)", url: `https://github.com/${GITHUB_USER}?tab=overview` },
    { key: "dayStreak" as const, icon: Flame, label: "Streak", value: data.streak.current, iconColor: "var(--gh-mix-issues)", url: `https://github.com/${GITHUB_USER}?tab=overview` },
    { key: "longestStreak" as const, icon: Award, label: "Best", value: data.streak.longest, iconColor: "var(--gh-mix-commits)", url: `https://github.com/${GITHUB_USER}?tab=overview` },
    { key: "activeDays" as const, icon: CalendarDays, label: "Active", value: data.streak.activeDays, iconColor: "var(--gh-mix-prs)", url: `https://github.com/${GITHUB_USER}?tab=overview` },
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => {
          const isStreak = s.key.includes("Streak") || s.key === "dayStreak";
          return (
            <motion.a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              title={`${s.label}: ${s.value.toLocaleString()} on GitHub`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ delay: isStreak ? 0.2 : 0.05, type: "spring", stiffness: 400, damping: 20 }}
              className="gh-stat group relative flex flex-col justify-between rounded-lg border border-black-50 bg-black-200/70 p-2.5 sm:p-3 transition-colors hover:border-white-50/30 hover:bg-black-200 cursor-pointer"
            >
              <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-white-50/50">
                <div className="flex items-center gap-1.5">
                  <s.icon
                    className="size-3.5 shrink-0 transition-transform group-hover:scale-110"
                    style={{ color: s.iconColor }}
                  />
                  <span>{s.label}</span>
                </div>
                <ArrowUpRight className="size-3 text-white-50/30 opacity-0 group-hover:opacity-100 transition-all group-hover:text-white-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-white-50 sm:text-lg whitespace-nowrap">
                <span data-count={s.value}>0</span>
              </div>
            </motion.a>
          );
        })}
      </div>

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
            url: string;
          }[] = [
            {
              key: "commits",
              label: "Commits",
              shortLabel: "Commits",
              angle: -90,
              color: "var(--gh-mix-commits)",
              count: data.metrics?.commits ?? Math.round(data.total * 0.96),
              desc: "Authored & pushed commits",
              url: `https://github.com/${GITHUB_USER}?tab=overview`,
            },
            {
              key: "prs",
              label: "Pull requests",
              shortLabel: "PRs",
              angle: -30,
              color: "var(--gh-mix-prs)",
              count: data.metrics?.prs ?? 42,
              desc: "Authored pull requests",
              url: `https://github.com/pulls?q=is%3Apr+author%3A${GITHUB_USER}`,
            },
            {
              key: "reviews",
              label: "Code review",
              shortLabel: "Reviews",
              angle: 30,
              color: "var(--gh-mix-reviews)",
              count: data.metrics?.reviews ?? 28,
              desc: "Peer reviews & approvals",
              url: `https://github.com/pulls?q=is%3Apr+reviewed-by%3A${GITHUB_USER}`,
            },
            {
              key: "comments",
              label: "Comments",
              shortLabel: "Comments",
              angle: 90,
              color: "var(--gh-mix-comments)",
              count: data.metrics?.comments ?? 68,
              desc: "Review & issue discussions",
              url: `https://github.com/pulls?q=is%3Apr+commenter%3A${GITHUB_USER}`,
            },
            {
              key: "issues",
              label: "Issues",
              shortLabel: "Issues",
              angle: 150,
              color: "var(--gh-mix-issues)",
              count: data.metrics?.issues ?? 14,
              desc: "Reported & triaged issues",
              url: `https://github.com/issues?q=is%3Aissue+author%3A${GITHUB_USER}`,
            },
            {
              key: "interactions",
              label: "Interactions",
              shortLabel: "Collabs",
              angle: 210,
              color: "var(--gh-mix-interactions)",
              count: data.metrics?.interactions ?? 52,
              desc: "Community repos & stars",
              url: `https://github.com/${GITHUB_USER}?tab=repositories`,
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
          const activeCoord = coords.find((c) => c.key === hoveredAxis);

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

                  {/* Outer drop-glow for polygon and highlighted spoke */}
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
                    className={hoveredAxis === c.key ? "text-white-50/40" : "text-white-50/12"}
                    strokeWidth={hoveredAxis === c.key ? 1.2 : 0.8}
                    strokeDasharray={hoveredAxis === c.key ? "none" : "2 3"}
                  />
                ))}

                {/* Ambient glow under-layer */}
                <polygon
                  points={polyPoints}
                  fill="none"
                  stroke="var(--gh-mix-commits)"
                  strokeWidth={4}
                  strokeOpacity={hoveredAxis ? 0.35 : 0.25}
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
                {coords.map((c) => {
                  const isHovered = hoveredAxis === c.key;
                  const isOtherHovered = hoveredAxis != null && !isHovered;
                  return (
                    <line
                      key={`arm-${c.key}`}
                      className="mix-arm transition-all duration-200"
                      x1={cx}
                      y1={cy}
                      x2={c.tx}
                      y2={c.ty}
                      pathLength={1}
                      stroke={c.color}
                      strokeWidth={isHovered ? 3.8 : 2.2}
                      strokeLinecap="round"
                      opacity={isOtherHovered ? 0.35 : 1}
                      filter={isHovered ? "url(#ghRadarGlow)" : undefined}
                    />
                  );
                })}

                {/* Pulsing beacon on the dominant apex (Commits) when idle */}
                {!hoveredAxis && (
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
                )}

                {/* Center 3D Hub */}
                <circle cx={cx} cy={cy} r={10} fill="var(--gh-mix-commits)" fillOpacity={0.15} stroke="var(--gh-mix-commits)" strokeOpacity={0.3} strokeWidth={1} />
                <circle cx={cx} cy={cy} r={5.5} fill="url(#ghRadarHub)" />
                <circle cx={cx} cy={cy} r={2} fill="#ffffff" />

                {/* Interactive Clickable Spoke + Node Hit targets */}
                {coords.map((c) => {
                  const isHovered = hoveredAxis === c.key;
                  const isOtherHovered = hoveredAxis != null && !isHovered;
                  return (
                    <a
                      key={`interactive-${c.key}`}
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredAxis(c.key)}
                      onMouseLeave={() => setHoveredAxis(null)}
                      onFocus={() => setHoveredAxis(c.key)}
                      onBlur={() => setHoveredAxis(null)}
                      aria-label={`${c.label}: ${c.count.toLocaleString()} (${c.desc}) — click to view on GitHub`}
                    >
                      {/* Wide invisible line & disc hit zones */}
                      <line
                        x1={cx}
                        y1={cy}
                        x2={c.ox}
                        y2={c.oy}
                        stroke="transparent"
                        strokeWidth={22}
                      />
                      <circle
                        cx={c.tx}
                        cy={c.ty}
                        r={18}
                        fill="transparent"
                      />

                      {/* Active highlight ring on hover */}
                      {isHovered && (
                        <>
                          <circle
                            className="animate-ping"
                            cx={c.tx}
                            cy={c.ty}
                            r={11}
                            fill="none"
                            stroke={c.color}
                            strokeWidth={2}
                            style={{ animationDuration: "1.6s" }}
                          />
                          <circle
                            cx={c.tx}
                            cy={c.ty}
                            r={8}
                            fill={c.color}
                            fillOpacity={0.3}
                            stroke={c.color}
                            strokeWidth={1.5}
                          />
                        </>
                      )}

                      {/* Tip node marker */}
                      <circle
                        className="mix-tip transition-transform duration-150"
                        cx={c.tx}
                        cy={c.ty}
                        r={isHovered ? 5.5 : c.pct > 60 ? 4.5 : 3.5}
                        fill={c.color}
                        opacity={isOtherHovered ? 0.35 : 1}
                      />
                      <circle
                        cx={c.tx}
                        cy={c.ty}
                        r={isHovered ? 2.5 : c.pct > 60 ? 2 : 1.5}
                        fill="#ffffff"
                        opacity={isOtherHovered ? 0.35 : 1}
                      />
                    </a>
                  );
                })}

                {/* Peripheral HUD Labels for all 6 dimensions (all clickable & interactive) */}
                {/* 1. Commits (Top) */}
                <a
                  href={coords[0].url}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxis("commits")}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  <text
                    x={cx}
                    y={cy - R - 13}
                    textAnchor="middle"
                    className={clsx(
                      "text-[10.5px] tabular-nums transition-colors",
                      hoveredAxis === "commits" ? "fill-blue-400 font-extrabold" : "fill-white-50 font-bold"
                    )}
                  >
                    {coords[0].pct}% · {coords[0].count >= 1000 ? `${(coords[0].count / 1000).toFixed(1)}k` : coords[0].count}
                  </text>
                  <text
                    x={cx}
                    y={cy - R - 3}
                    textAnchor="middle"
                    className={clsx(
                      "text-[9px] transition-colors",
                      hoveredAxis === "commits" ? "fill-white-50 font-semibold" : "fill-white-50/60"
                    )}
                  >
                    Commits
                  </text>
                </a>

                {/* 2. Pull requests (Top-Right) */}
                <a
                  href={coords[1].url}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxis("prs")}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  <text
                    x={cx + R * 0.866 + 8}
                    y={cy - R * 0.5 - 2}
                    textAnchor="start"
                    className={clsx(
                      "text-[10.5px] tabular-nums transition-colors",
                      hoveredAxis === "prs" ? "fill-blue-400 font-extrabold" : "fill-white-50 font-bold"
                    )}
                  >
                    {coords[1].pct}% · {coords[1].count}
                  </text>
                  <text
                    x={cx + R * 0.866 + 8}
                    y={cy - R * 0.5 + 9}
                    textAnchor="start"
                    className={clsx(
                      "text-[9px] transition-colors",
                      hoveredAxis === "prs" ? "fill-white-50 font-semibold" : "fill-white-50/60"
                    )}
                  >
                    Pull requests
                  </text>
                </a>

                {/* 3. Code review (Bottom-Right) */}
                <a
                  href={coords[2].url}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxis("reviews")}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  <text
                    x={cx + R * 0.866 + 8}
                    y={cy + R * 0.5 - 2}
                    textAnchor="start"
                    className={clsx(
                      "text-[10.5px] tabular-nums transition-colors",
                      hoveredAxis === "reviews" ? "fill-indigo-400 font-extrabold" : "fill-white-50 font-bold"
                    )}
                  >
                    {coords[2].pct}% · {coords[2].count}
                  </text>
                  <text
                    x={cx + R * 0.866 + 8}
                    y={cy + R * 0.5 + 9}
                    textAnchor="start"
                    className={clsx(
                      "text-[9px] transition-colors",
                      hoveredAxis === "reviews" ? "fill-white-50 font-semibold" : "fill-white-50/60"
                    )}
                  >
                    Code review
                  </text>
                </a>

                {/* 4. Comments (Bottom) */}
                <a
                  href={coords[3].url}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxis("comments")}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  <text
                    x={cx}
                    y={cy + R + 14}
                    textAnchor="middle"
                    className={clsx(
                      "text-[10.5px] tabular-nums transition-colors",
                      hoveredAxis === "comments" ? "fill-purple-400 font-extrabold" : "fill-white-50 font-bold"
                    )}
                  >
                    {coords[3].pct}% · {coords[3].count}
                  </text>
                  <text
                    x={cx}
                    y={cy + R + 24}
                    textAnchor="middle"
                    className={clsx(
                      "text-[9px] transition-colors",
                      hoveredAxis === "comments" ? "fill-white-50 font-semibold" : "fill-white-50/60"
                    )}
                  >
                    Comments
                  </text>
                </a>

                {/* 5. Issues (Bottom-Left) */}
                <a
                  href={coords[4].url}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxis("issues")}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  <text
                    x={cx - R * 0.866 - 8}
                    y={cy + R * 0.5 - 2}
                    textAnchor="end"
                    className={clsx(
                      "text-[10.5px] tabular-nums transition-colors",
                      hoveredAxis === "issues" ? "fill-sky-400 font-extrabold" : "fill-white-50 font-bold"
                    )}
                  >
                    {coords[4].pct}% · {coords[4].count}
                  </text>
                  <text
                    x={cx - R * 0.866 - 8}
                    y={cy + R * 0.5 + 9}
                    textAnchor="end"
                    className={clsx(
                      "text-[9px] transition-colors",
                      hoveredAxis === "issues" ? "fill-white-50 font-semibold" : "fill-white-50/60"
                    )}
                  >
                    Issues
                  </text>
                </a>

                {/* 6. Interactions (Top-Left) */}
                <a
                  href={coords[5].url}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxis("interactions")}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  <text
                    x={cx - R * 0.866 - 8}
                    y={cy - R * 0.5 - 2}
                    textAnchor="end"
                    className={clsx(
                      "text-[10.5px] tabular-nums transition-colors",
                      hoveredAxis === "interactions" ? "fill-cyan-400 font-extrabold" : "fill-white-50 font-bold"
                    )}
                  >
                    {coords[5].pct}% · {coords[5].count}
                  </text>
                  <text
                    x={cx - R * 0.866 - 8}
                    y={cy - R * 0.5 + 9}
                    textAnchor="end"
                    className={clsx(
                      "text-[9px] transition-colors",
                      hoveredAxis === "interactions" ? "fill-white-50 font-semibold" : "fill-white-50/60"
                    )}
                  >
                    Interactions
                  </text>
                </a>
              </svg>

              {/* Dynamic Interactive Radar HUD Status Bar */}
              <div className="mt-1 min-h-[36px] flex items-center justify-center">
                {activeCoord ? (
                  <motion.a
                    href={activeCoord.url}
                    target="_blank"
                    rel="noreferrer"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex w-full items-center justify-between rounded-md border border-white-50/25 bg-black-100/95 px-3 py-1.5 text-xs backdrop-blur-md shadow-lg group hover:border-white-50/50 transition-all cursor-pointer"
                    style={{ boxShadow: `0 0 16px ${activeCoord.color}35` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2 rounded-full shrink-0 animate-pulse"
                        style={{ backgroundColor: activeCoord.color }}
                      />
                      <span className="font-semibold text-white-50 truncate">
                        {activeCoord.label}
                      </span>
                      <span className="text-white-50/40 text-[10px]">·</span>
                      <span className="font-mono text-white-50 font-bold tabular-nums">
                        {activeCoord.count.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-white-50/55 hidden sm:inline truncate">
                        ({activeCoord.desc})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] font-medium shrink-0 ml-2" style={{ color: activeCoord.color }}>
                      <span>{activeCoord.pct}% score</span>
                      <span className="text-white-50/40">·</span>
                      <span className="underline-offset-2 group-hover:underline">Open on GitHub</span>
                      <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </motion.a>
                ) : (
                  <div className="flex w-full items-center justify-between rounded-md border border-black-50/50 bg-black-300/30 px-3 py-1.5 text-[10.5px] text-white-50/45">
                    <span className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-blue-400/80 animate-pulse" />
                      Hover any spoke or dimension to inspect details
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-white-50/40">
                      <span>Click to open on GitHub</span>
                      <ArrowUpRight className="size-2.5 opacity-60" />
                    </span>
                  </div>
                )}
              </div>

              {/* 6-metric interactive summary pill row with bidirectional highlighting */}
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2 border-t border-black-50/60 text-center">
                {coords.map((c) => {
                  const isHovered = hoveredAxis === c.key;
                  return (
                    <motion.a
                      key={c.key}
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      onMouseEnter={() => setHoveredAxis(c.key)}
                      onMouseLeave={() => setHoveredAxis(null)}
                      whileHover={{ y: -2, scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className={clsx(
                        "group relative flex flex-col items-center justify-center rounded-md px-1.5 py-1.5 transition-all duration-200 cursor-pointer border",
                        isHovered
                          ? "border-opacity-100 bg-black-100 shadow-md"
                          : "border-black-50/60 bg-black-300/40 hover:border-black-50 hover:bg-black-200/80"
                      )}
                      style={{
                        borderColor: isHovered ? c.color : undefined,
                        boxShadow: isHovered ? `0 0 14px ${c.color}35` : undefined,
                      }}
                      title={`Open ${c.label} on GitHub: ${c.count.toLocaleString()} (${c.desc})`}
                    >
                      <div className="flex items-center gap-0.5">
                        <span className="text-[11.5px] font-bold tabular-nums text-white-50">
                          {c.count >= 1000 ? `${(c.count / 1000).toFixed(1)}k` : c.count}
                        </span>
                        <ArrowUpRight
                          className={clsx(
                            "size-2.5 transition-all duration-150",
                            isHovered
                              ? "opacity-100 translate-x-0.5 -translate-y-0.5"
                              : "opacity-0 group-hover:opacity-100"
                          )}
                          style={{ color: c.color }}
                        />
                      </div>
                      <span
                        className="text-[9.5px] font-medium truncate w-full"
                        style={{ color: c.color }}
                      >
                        {c.shortLabel}
                      </span>
                    </motion.a>
                  );
                })}
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
                href={`https://github.com/${GITHUB_USER}?tab=overview`}
                target="_blank"
                rel="noreferrer"
                className="wk-bar group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                title={`${b.label}: ~${b.avgPerDay} contribs/day avg (${b.count.toLocaleString("en-US")} total over 52 weeks)`}
              >
                {/* Floating exact daily average + yearly total tooltip */}
                <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:-top-15 z-30">
                  <div className="flex flex-col items-center whitespace-nowrap rounded-md border border-black-50/90 bg-black-100/95 px-2.5 py-1 text-center shadow-2xl backdrop-blur-md">
                    <span className="text-[10.5px] font-semibold tabular-nums text-white-50">
                      ~{b.avgPerDay} contribs/day
                    </span>
                    <span className="text-[9px] text-white-50/50">
                      {b.pctOfYear}% of year · {b.count.toLocaleString()} total (52 wks)
                    </span>
                    <div className="flex items-center gap-1 text-[8.5px] text-blue-400 font-medium pt-0.5">
                      <span>View activity timeline</span>
                      <ArrowUpRight className="size-2 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Animated bar */}
                <div
                  className="wk-bar-fill w-full rounded-t-[3px] transition-all duration-200 group-hover:brightness-135 group-hover:scale-x-110 group-hover:shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                  style={{
                    height: `${barHeightPx}px`,
                    backgroundColor: b.count > 0 ? "var(--gh-mix-prs)" : "rgba(255, 255, 255, 0.08)",
                  }}
                />

                {/* Weekday label */}
                <span className="mt-1 text-[9px] font-medium text-white-50/45 group-hover:text-white-50 transition-colors">
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
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="gh-org-card group flex items-center justify-between rounded-lg border border-black-50 bg-black-200/70 p-2 text-xs text-white-50/80 transition-all hover:border-blue-400/40 hover:bg-black-200 hover:text-white-50 hover:shadow-[0_0_12px_rgba(59,130,246,0.15)] cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={icon}
                  alt={name}
                  className="size-5 rounded-md object-contain shrink-0 bg-black-300 transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <span className="truncate font-medium text-[11px] group-hover:text-white-50">{name}</span>
              </div>
              <ArrowUpRight className="size-3 text-white-50/40 group-hover:text-white-50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
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
                <a
                  href={`https://github.com/pulls?q=is%3Apr+author%3A${GITHUB_USER}+is%3Amerged`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 transition-all hover:border-purple-500/50 hover:bg-purple-500/20 text-purple-300 cursor-pointer"
                  title="View all merged pull requests on GitHub"
                >
                  <span className="size-1.5 rounded-full bg-purple-400" />
                  {mergedCount} merged
                  <ArrowUpRight className="size-2 text-purple-400/60" />
                </a>
              )}
              {reviewsCount > 0 && (
                <a
                  href={`https://github.com/pulls?q=is%3Apr+reviewed-by%3A${GITHUB_USER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
                  title="View all reviewed pull requests on GitHub"
                >
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {reviewsCount} reviewed
                  <ArrowUpRight className="size-2 text-emerald-400/60" />
                </a>
              )}
              {pushesCount > 0 && (
                <a
                  href={`https://github.com/${GITHUB_USER}?tab=repositories`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 transition-all hover:border-sky-500/50 hover:bg-sky-500/20 text-sky-300 cursor-pointer"
                  title="View active repositories on GitHub"
                >
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  {pushesCount} pushed
                  <ArrowUpRight className="size-2 text-sky-400/60" />
                </a>
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
                <motion.li key={p.url || p.number} whileHover={{ x: 4, scale: 1.01 }}>
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="gh-oss-row group flex items-center justify-between gap-2.5 rounded-lg border border-black-50/70 bg-black-200/50 px-3 py-2 transition-all hover:border-purple-400/40 hover:bg-black-100 hover:shadow-[0_2px_12px_rgba(0,0,0,0.5)] cursor-pointer"
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
                <motion.li key={r.url || r.number} whileHover={{ x: 4, scale: 1.01 }}>
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="gh-oss-row group flex items-center justify-between gap-2.5 rounded-lg border border-black-50/70 bg-black-200/50 px-3 py-2 transition-all hover:border-emerald-400/40 hover:bg-black-100 hover:shadow-[0_2px_12px_rgba(0,0,0,0.5)] cursor-pointer"
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
