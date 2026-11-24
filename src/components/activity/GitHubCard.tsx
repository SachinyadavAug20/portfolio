import { useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
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
  if (secs < 60) return `${secs}s ago`;
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

      /* activity-overview cross: arms draw out from the center, tips pop in */
      gsap.fromTo(
        scope.querySelectorAll(".mix-arm"),
        { strokeDasharray: 1, strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
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
    },
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true },
  );

  /* OSS rows: enter with a left-to-right slide-in sweep + stagger. */
  useGSAP(
    () => {
      if (reduced) return;
      const rows = rootRef.current?.querySelectorAll<HTMLElement>(".gh-oss-row");
      if (!rows || rows.length === 0) return;
      gsap.fromTo(
        rows,
        { x: -14, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.35,
          ease: "power3.out",
          stagger: { each: 0.05, from: "start" },
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: rootRef.current, start: "top 85%", once: true },
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

  const mix = [
    { key: "commits" as const, label: "Commits" },
    { key: "prs" as const, label: "Pull requests" },
    { key: "reviews" as const, label: "Code review" },
    { key: "issues" as const, label: "Issues" },
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

  useEffect(() => {
    if (reduced) return;
    const els = rootRef.current?.querySelectorAll<HTMLElement>(".wk-bar");
    if (!els || els.length === 0) return;
    gsap.fromTo(
      els,
      { y: 10, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.04,
        duration: 0.45,
        ease: "power2.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 85%", once: true },
      },
    );
  }, [reduced, weekdayBars]);

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="card-border relative flex flex-col gap-5 rounded-xl p-5 sm:p-6"
    >
      {/* header */}
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

      {/* headline stats — every tile links to the calendar (proof of streaks) */}
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

      {/* heatmap */}
      <div className="flex flex-col gap-2">
        <Heatmap
          days={data.days}
          label="GitHub"
          getCellHref={(c) => `https://github.com/${GITHUB_USER}?tab=overview&from=${c.date}&to=${c.date}`}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <HeatmapLegend href={`https://github.com/users/${GITHUB_USER}/contributions`} />
          <span className="text-[10px] text-white-50/55">
            {data.from} → {data.to}
          </span>
        </div>
      </div>

      {/* activity mix — dimensional overview with radar concentric rings and polygon */}
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
          const cx = 150;
          const cy = 100;
          const axes: {
            key: "commits" | "reviews" | "issues" | "prs";
            dx: number;
            dy: number;
            anchor: "start" | "middle" | "end";
            lx: number;
            ly: number;
          }[] = [
            { key: "commits", dx: -1, dy: 0, anchor: "end", lx: -8, ly: 0 },
            { key: "reviews", dx: 0, dy: -1, anchor: "middle", lx: 0, ly: -16 },
            { key: "issues", dx: 1, dy: 0, anchor: "start", lx: 8, ly: 0 },
            { key: "prs", dx: 0, dy: 1, anchor: "middle", lx: 0, ly: 16 },
          ];
          const coords = axes.map(({ key, dx, dy }) => {
            const pct = data.breakdown[key];
            const len = Math.min(95, 24 + pct * 0.72);
            return { key, tx: cx + dx * len, ty: cy + dy * len, len, pct };
          });
          const polyPoints = coords.map((c) => `${c.tx.toFixed(1)},${c.ty.toFixed(1)}`).join(" ");

          return (
            <svg
              viewBox="0 0 300 200"
              className="mx-auto h-44 w-full max-w-[300px]"
              role="img"
              aria-label="Activity overview by type"
            >
              {/* Radar guide concentric rings giving dimension */}
              {[25, 50, 75, 95].map((r) => (
                <circle
                  key={r}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="2 3"
                  className="text-white-50/10"
                />
              ))}

              {/* Cross background axis lines */}
              <line x1={cx - 95} y1={cy} x2={cx + 95} y2={cy} stroke="currentColor" className="text-white-50/15" strokeWidth={1} />
              <line x1={cx} y1={cy - 95} x2={cx} y2={cy + 95} stroke="currentColor" className="text-white-50/15" strokeWidth={1} />

              {/* Translucent radar polygon shape */}
              <polygon
                points={polyPoints}
                fill="var(--gh-mix-commits)"
                fillOpacity={0.12}
                stroke="var(--gh-mix-commits)"
                strokeOpacity={0.4}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              {/* Four active arms with glowing tips */}
              {axes.map(({ key, dy, anchor, lx, ly }) => {
                const coord = coords.find((c) => c.key === key)!;
                const label = mix.find((m) => m.key === key)?.label ?? key;
                return (
                  <g key={key}>
                    <line
                      className="mix-arm"
                      x1={cx}
                      y1={cy}
                      x2={coord.tx}
                      y2={coord.ty}
                      pathLength={1}
                      stroke={`var(--gh-mix-${key})`}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <circle className="mix-tip" cx={coord.tx} cy={coord.ty} r={4} fill={`var(--gh-mix-${key})`} />
                    <text
                      x={coord.tx + lx}
                      y={coord.ty + ly + (dy === 0 ? -3 : dy === -1 ? 0 : 12)}
                      textAnchor={anchor}
                      className="fill-white-50 text-[11px] font-semibold"
                    >
                      {coord.pct}%
                    </text>
                    <text
                      x={coord.tx + lx}
                      y={coord.ty + ly + (dy === 0 ? 10 : dy === -1 ? 12 : 24)}
                      textAnchor={anchor}
                      className="fill-white-50/60 text-[10px]"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Center core */}
              <circle cx={cx} cy={cy} r={5} fill="var(--gh-mix-commits)" />
              <circle cx={cx} cy={cy} r={9} fill="none" stroke="var(--gh-mix-commits)" strokeOpacity={0.35} />
            </svg>
          );
        })()}
      </div>

      {/* weekday distribution — daily activity by day of the week */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white-50/55">
          <span>Activity by weekday</span>
          <span className="text-[10px] text-white-50/40">Sun → Sat</span>
        </div>
        <div className="flex h-14 items-end gap-1.5 sm:gap-2 pt-2">
          {weekdayBars.map((b) => {
            const barHeightPx = Math.max(4, Math.round(b.pct * 40));
            return (
              <a
                key={b.label}
                href={CAL_URL}
                target="_blank"
                rel="noreferrer"
                className="wk-bar group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                title={`${b.label}: ${b.count.toLocaleString("en-US")} contributions`}
              >
                <div
                  className="w-full rounded-t-[3px] transition-all duration-200 group-hover:brightness-125 group-hover:scale-x-105"
                  style={{
                    height: `${barHeightPx}px`,
                    backgroundColor: b.count > 0 ? "var(--gh-mix-prs)" : "rgba(255, 255, 255, 0.08)",
                  }}
                />
                <span className="mt-1 text-[9px] text-white-50/45 group-hover:text-white-50 transition-colors">
                  {b.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* orgs — curated top 3: jabref, airflow, meshery */}
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
              className="flex items-center justify-between rounded-lg border border-black-50 bg-black-200/70 p-2 text-xs text-white-50/80 transition-colors hover:border-white-50/30 hover:bg-black-200 hover:text-white-50"
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

      {/* OSS activity — merged PRs + PR reviews from the Events feed. */}
      {oss && (oss.counts.mergedPulls > 0 || oss.counts.reviews > 0) && (
        <div className="gh-oss">
          <div className="mb-2 flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wider text-white-50/55">
              OSS activity
            </span>
            <span className="text-[10px] text-white-50/50">
              {oss.counts.mergedPulls} merged · {oss.counts.reviews} reviewed ·{" "}
              {oss.counts.pushes} pushed
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {oss.mergedPulls.slice(0, 6).map((p) => (
              <motion.li
                key={p.url}
                whileHover={{ x: 4 }}
                className="gh-oss-row gh-oss-row-pr"
              >
                <GitPullRequest className="size-3 shrink-0 text-[var(--gh-mix-commits)]" />
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-[11px] text-white-50/75 transition-colors hover:text-white-50"
                  title={p.title}
                >
                  {p.title}
                </a>
                <span className="gh-oss-meta">
                  {repoShort(p.repo)}
                  <span className="text-white-50/40">#{p.number}</span>
                  <span className="gh-oss-age">{ago(p.at)}</span>
                </span>
              </motion.li>
            ))}
            {oss.reviews.slice(0, 4).map((r) => (
              <motion.li key={r.url} whileHover={{ x: 4 }} className="gh-oss-row">
                <span
                  className="gh-oss-state"
                  style={{ color: `var(--gh-mix-reviews)` }}
                >
                  {r.state === "approved" ? "approved" : r.state === "changes_requested" ? "requested changes" : "reviewed"}
                </span>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-[11px] text-white-50/75 transition-colors hover:text-white-50"
                  title={r.title}
                >
                  {r.title}
                </a>
                <span className="gh-oss-meta">
                  {repoShort(r.repo)}
                  <span className="text-white-50/40">#{r.number}</span>
                  <span className="gh-oss-age">{ago(r.at)}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

export default GitHubCard;
