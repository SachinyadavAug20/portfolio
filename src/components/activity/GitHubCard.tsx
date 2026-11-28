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

/** 2,675 → "2.7k", 42 → "42" — compact counts for radar labels. */
const shortCount = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

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

      /* contribution-mix radar */
      gsap.fromTo(
        scope.querySelectorAll(".gh-radar-poly"),
        { scale: 0.6, opacity: 0, transformOrigin: "center center" },
        {
          scale: 1,
          opacity: 1,
          duration: 0.7,
          ease: "back.out(1.3)",
          delay: 0.15,
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );
      gsap.fromTo(
        scope.querySelectorAll(".gh-radar-dot"),
        { scale: 0, transformOrigin: "center center" },
        {
          scale: 1,
          duration: 0.4,
          ease: "back.out(2)",
          stagger: 0.05,
          delay: 0.3,
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

  /* Weekday totals — seven bars, one per day of the week. */
  const weekdayBars = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = Array.from({ length: 7 }, () => 0);
    for (const d of data.days) {
      const wd = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      buckets[wd] += d.count;
    }
    const max = Math.max(1, ...buckets);
    return labels.map((label, i) => ({
      label,
      pct: buckets[i] / max,
      count: buckets[i],
    }));
  }, [data.days]);

  /* Plain-language contribution split — counts only, no scores. */
  const mix = [
    { key: "commits", label: "Commits", color: "var(--gh-mix-commits)", count: data.metrics?.commits ?? Math.round(data.total * 0.96), url: `https://github.com/${GITHUB_USER}?tab=overview` },
    { key: "prs", label: "Pull requests", color: "var(--gh-mix-prs)", count: data.metrics?.prs ?? 42, url: `https://github.com/pulls?q=is%3Apr+author%3A${GITHUB_USER}` },
    { key: "reviews", label: "Reviews", color: "var(--gh-mix-reviews)", count: data.metrics?.reviews ?? 28, url: `https://github.com/pulls?q=is%3Apr+reviewed-by%3A${GITHUB_USER}` },
    { key: "comments", label: "Comments", color: "var(--gh-mix-comments)", count: data.metrics?.comments ?? 68, url: `https://github.com/pulls?q=is%3Apr+commenter%3A${GITHUB_USER}` },
    { key: "issues", label: "Issues", color: "var(--gh-mix-issues)", count: data.metrics?.issues ?? 14, url: `https://github.com/issues?q=is%3Aissue+author%3A${GITHUB_USER}` },
    { key: "interactions", label: "Collaborations", color: "var(--gh-mix-interactions)", count: data.metrics?.interactions ?? 52, url: `https://github.com/${GITHUB_USER}?tab=repositories` },
  ];

  /* Radar geometry — six axes, shape driven by the yearly breakdown. */
  const radar = (() => {
    const cx = 180;
    const cy = 118;
    const R = 66;
    const angles = [-90, -30, 30, 90, 150, 210];
    const points = mix.map((m, i) => {
      const rad = (angles[i] * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      const pct = data.breakdown[m.key as keyof GithubActivity["breakdown"]] ?? 50;
      const len = 16 + (Math.max(0, Math.min(100, pct)) / 100) * (R - 16);
      return {
        ...m,
        dx,
        dy,
        tx: cx + dx * len,
        ty: cy + dy * len,
        ox: cx + dx * R,
        oy: cy + dy * R,
        lx: cx + dx * (R + 16),
        ly: cy + dy * (R + 16),
      };
    });
    const ring = (radius: number) =>
      points
        .map((p) => `${(cx + p.dx * radius).toFixed(1)},${(cy + p.dy * radius).toFixed(1)}`)
        .join(" ");
    return {
      cx,
      cy,
      points,
      polygon: points.map((p) => `${p.tx.toFixed(1)},${p.ty.toFixed(1)}`).join(" "),
      outer: ring(R),
      inner: ring(R * 0.55),
    };
  })();

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

      {/* 3. Contribution mix — minimal 6-axis radar, counts only */}
      <div className="flex flex-col gap-2">
        <a
          href={CAL_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between text-[11px] uppercase tracking-wider text-white-50/55 transition-colors hover:text-white-50"
        >
          <span>Contribution mix</span>
          <span className="flex items-center gap-1 normal-case tracking-normal text-[10px] text-white-50/40 transition-colors group-hover:text-white-50/70">
            View on GitHub
            <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </a>

        <div className="rounded-lg border border-black-50/70 bg-black-200/40 p-3">
          <svg
            viewBox="0 0 360 250"
            className="mx-auto h-56 w-full max-w-[360px]"
            role="img"
            aria-label="Six-axis contribution mix: commits, pull requests, reviews, comments, issues and collaborations"
          >
            <defs>
              <linearGradient id="ghMixFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gh-mix-commits)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--gh-mix-comments)" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {/* guide rings */}
            <polygon
              points={radar.outer}
              fill="none"
              stroke="currentColor"
              strokeDasharray="2 4"
              strokeWidth={1}
              className="text-white-50/15"
            />
            <polygon
              points={radar.inner}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              className="text-white-50/8"
            />

            {/* spokes */}
            {radar.points.map((p) => (
              <line
                key={`spoke-${p.key}`}
                x1={radar.cx}
                y1={radar.cy}
                x2={p.ox}
                y2={p.oy}
                stroke="currentColor"
                strokeDasharray="2 4"
                strokeWidth={1}
                className="text-white-50/12"
              />
            ))}

            {/* filled shape */}
            <polygon
              className="gh-radar-poly"
              points={radar.polygon}
              fill="url(#ghMixFill)"
              stroke="var(--gh-mix-commits)"
              strokeOpacity={0.85}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />

            {/* centre */}
            <circle cx={radar.cx} cy={radar.cy} r={2.5} fill="var(--gh-mix-commits)" fillOpacity={0.7} />

            {/* nodes + labels */}
            {radar.points.map((p) => {
              const anchor = p.dx > 0.3 ? "start" : p.dx < -0.3 ? "end" : "middle";
              const nameY = p.dy > 0.5 ? p.ly : p.dy < -0.5 ? p.ly - 11 : p.ly - 1;
              return (
                <a
                  key={p.key}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group cursor-pointer"
                  aria-label={`${p.label}: ${p.count.toLocaleString()} — view on GitHub`}
                >
                  <circle
                    className="gh-radar-dot opacity-80 transition-opacity group-hover:opacity-100"
                    cx={p.tx}
                    cy={p.ty}
                    r={3.2}
                    fill={p.color}
                  />
                  <text
                    x={p.lx}
                    y={nameY}
                    textAnchor={anchor}
                    className="fill-white-50/45 text-[8.5px] transition-colors group-hover:fill-white-50/75"
                  >
                    {p.label}
                  </text>
                  <text
                    x={p.lx}
                    y={nameY + 11}
                    textAnchor={anchor}
                    className="fill-white-50 text-[10px] font-semibold tabular-nums transition-colors group-hover:fill-white-50"
                  >
                    {shortCount(p.count)}
                  </text>
                </a>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 4. Busiest days — one bar per weekday, with plain counts */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white-50/55">
          <span>Busiest days</span>
          <span className="normal-case tracking-normal text-[10px] text-white-50/40">
            last 52 weeks
          </span>
        </div>
        <div className="flex items-end gap-1.5 sm:gap-2">
          {weekdayBars.map((b) => (
            <a
              key={b.label}
              href={`https://github.com/${GITHUB_USER}?tab=overview`}
              target="_blank"
              rel="noreferrer"
              title={`${b.label}: ${b.count.toLocaleString("en-US")} contributions`}
              className="group flex flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-[9.5px] tabular-nums text-white-50/40 transition-colors group-hover:text-white-50/80">
                {b.count >= 1000 ? `${(b.count / 1000).toFixed(1)}k` : b.count}
              </span>
              <span className="flex h-14 w-full items-end">
                <span
                  className="wk-bar-fill w-full rounded-t-[3px] transition-all duration-200 group-hover:brightness-125"
                  style={{
                    height: `${Math.max(4, Math.round(b.pct * 56))}px`,
                    backgroundColor:
                      b.count > 0 ? "var(--gh-mix-prs)" : "rgba(255, 255, 255, 0.08)",
                  }}
                />
              </span>
              <span className="text-[9px] font-medium text-white-50/45 transition-colors group-hover:text-white-50">
                {b.label}
              </span>
            </a>
          ))}
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
            { name: "Meshery", repo: "meshery/meshery", icon: "https://github.com/meshery.png" },
            { name: "Airflow", repo: "apache/airflow", icon: "https://github.com/apache.png" },
            { name: "JabRef", repo: "JabRef/jabref", icon: "https://github.com/JabRef.png" },
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
                  className="size-5 rounded-md object-contain shrink-0 bg-black-200 transition-transform group-hover:scale-105"
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
            <div className="flex items-center gap-3 text-[10px] text-white-50/45">
              {mergedCount > 0 && (
                <a
                  href={`https://github.com/pulls?q=is%3Apr+author%3A${GITHUB_USER}+is%3Amerged`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-purple-300"
                  title="View all merged pull requests on GitHub"
                >
                  <span className="size-1.5 rounded-full bg-purple-400" />
                  {mergedCount} merged
                </a>
              )}
              {reviewsCount > 0 && (
                <a
                  href={`https://github.com/pulls?q=is%3Apr+reviewed-by%3A${GITHUB_USER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-emerald-300"
                  title="View all reviewed pull requests on GitHub"
                >
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {reviewsCount} reviewed
                </a>
              )}
              {pushesCount > 0 && (
                <a
                  href={`https://github.com/${GITHUB_USER}?tab=repositories`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-sky-300"
                  title="View active repositories on GitHub"
                >
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  {pushesCount} pushed
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
                      <span className="rounded bg-black-200/80 px-1 py-0.5 text-[9px] text-white-50/55">{ago(p.at)}</span>
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
                      <span className="rounded bg-black-200/80 px-1 py-0.5 text-[9px] text-white-50/55">{ago(r.at)}</span>
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
