import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowUpRight,
  Flame,
  GitPullRequest,
  GitCommit,
  MessageSquare,
  CircleDot,
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

      /* activity-mix bar segments sweep out from the left */
      gsap.fromTo(
        scope.querySelectorAll(".gh-seg"),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.06,
          transformOrigin: "left center",
          clearProps: "transform",
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
    { key: "contributions" as const, icon: ListChecks, label: "Contributions", value: data.total, iconColor: "var(--gh-mix-commits)" },
    { key: "dayStreak" as const, icon: Flame, label: "Day streak", value: data.streak.current, iconColor: "var(--gh-mix-issues)" },
    { key: "longestStreak" as const, icon: Award, label: "Longest streak", value: data.streak.longest, iconColor: "var(--gh-mix-commits)" },
    { key: "activeDays" as const, icon: CalendarDays, label: "Active days", value: data.streak.activeDays, iconColor: "var(--gh-mix-prs)" },
  ];

  const mix = [
    { key: "commits" as const, label: "Commits" },
    { key: "prs" as const, label: "Pull requests" },
    { key: "reviews" as const, label: "Code review" },
    { key: "issues" as const, label: "Issues" },
  ];
  const CAL_URL = `https://github.com/users/${GITHUB_USER}/contributions`;

  /* Org chips: orgs we have merged PRs in (e.g. "meshery") first, then the
     scrape's org list — deduped, first 3. */
  const orgs = useMemo(() => {
    const set = new Set<string>();
    for (const p of oss?.mergedPulls ?? []) set.add(p.baseRepo.split("/")[0]);
    for (const o of data.orgs) set.add(o.replace(/^@/, ""));
    return Array.from(set).slice(0, 3);
  }, [data.orgs, oss?.mergedPulls]);

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
  const mixTotal = Math.max(
    1,
    mix.reduce((s, m) => s + data.breakdown[m.key], 0),
  );

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
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 cursor-pointer"
      >
        {stats.map((s) => {
          const isStreak = s.label.includes("streak");
          return (
            <motion.div
              key={s.key}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: isStreak ? 0.3 : 0.1, type: "spring", stiffness: 400, damping: 20 }}
              className="gh-stat rounded-lg border border-black-50 bg-black-200/70 px-3 py-2.5"
            >
              <div className="flex items-end gap-1.5">
                <s.icon
                  className={`size-3.5 shrink-0 transition-opacity ${s.key === "activeDays" ? "opacity-45 hover:opacity-70" : ""}`}
                  style={{ color: s.iconColor }}
                />
                <div className="text-lg font-semibold tabular-nums text-white-50 sm:text-xl">
                  <span data-count={s.value}>0</span>
                </div>
              </div>
              <div className="mt-0.5 pl-5 text-[9px] uppercase tracking-wider text-white-50/45">
                {s.label}
              </div>
            </motion.div>
          );
        })}
      </a>

      {/* heatmap */}
      <div className="flex flex-col gap-2">
        <Heatmap days={data.days} label="GitHub" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <HeatmapLegend />
          <span className="text-[10px] text-white-50/55">
            {data.from} → {data.to}
          </span>
        </div>
      </div>

      {/* activity mix — the summary of the calendar it represents */}
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
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-black-200">
          {mix.map((m) => {
            const pct = (data.breakdown[m.key] / mixTotal) * 100;
            return (
              <span
                key={m.key}
                className="gh-seg h-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: `var(--gh-mix-${m.key})`,
                }}
                title={`${m.label}: ${data.breakdown[m.key]}%`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white-50/70">
          {mix.map((m) => (
            <span key={m.key} className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: `var(--gh-mix-${m.key})` }}
              />
              {m.label} {data.breakdown[m.key]}%
            </span>
          ))}
        </div>
      </div>

      {/* weekday distribution — daily activity by day of the week */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-wider text-white-50/55">
          Activity by weekday
        </div>
        <div className="flex h-5 items-end gap-1.5">
          {weekdayBars.map((b) => (
            <a
              key={b.label}
              href={CAL_URL}
              target="_blank"
              rel="noreferrer"
              className="wk-bar group relative flex-1 cursor-pointer"
            >
              <span
                className="block h-full rounded-t-[2px] transition-all"
                style={{
                  height: `${Math.max(1, b.pct * 100)}%`,
                  backgroundColor: "var(--gh-mix-prs)",
                }}
                title={`${b.label}: ${b.count.toLocaleString("en-US")} contributions`}
              />
              <span className="absolute -top-3 text-[8px] text-white-50/45 leading-none">
                {b.label}
              </span>
            </a>
          ))}
        </div>
        {weekdayBars.some((b) => b.pct === 0) && (
          <div className="text-[9px] text-white-50/40">
            Minimal on some weekdays — activity peaks inline with your calendar.
          </div>
        )}
      </div>

      {/* badges — icon chips for commits, PRs, reviews, issues (like the
          LeetCode card's badge row) */}
      {(data.breakdown.commits ||
        data.breakdown.prs ||
        data.breakdown.reviews ||
        data.breakdown.issues) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-black-50 pt-4">
          <span className="text-[11px] uppercase tracking-wider text-white-50/55">
            Badges
          </span>
          {(
            [
              { key: "commits", label: "Commits", icon: GitCommit },
              { key: "prs", label: "Pull requests", icon: GitPullRequest },
              { key: "reviews", label: "Code review", icon: MessageSquare },
              { key: "issues", label: "Issues", icon: CircleDot },
            ] as const
          ).map(({ key, label, icon: Icon }) =>
            data.breakdown[key] ? (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-md border border-black-50 bg-black-200 px-2 py-1 text-[11px] text-white-50/70"
              >
                <Icon className="size-3.5 text-[var(--gh-mix-commits)]" />
                <span className="font-semibold tabular-nums">{data.breakdown[key]}%</span>
                <span>{label}</span>
              </span>
            ) : null,
          )}
        </div>
      )}

      {/* orgs — only the top 3; each links to the user's PRs tab on their
          repo when we know one, else to the org page */}
      {orgs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-black-50 pt-4">
          <span className="text-[11px] uppercase tracking-wider text-white-50/55">
            Orgs
          </span>
          {orgs.map((o) => {
            const pull = oss?.mergedPulls.find((p) =>
              p.baseRepo.toLowerCase().includes(o.toLowerCase()),
            );
            const href = pull
              ? `https://github.com/${pull.baseRepo}/pulls/${GITHUB_USER}`
              : `https://github.com/${o}`;
            return (
              <a
                key={o}
                href={href}
                target="_blank"
                rel="noreferrer"
                title={o}
                className="inline-flex items-center gap-1.5 rounded-md border border-black-50 bg-black-200 px-2 py-0.5 text-[11px] text-white-50/65 transition-colors hover:text-white-50 hover:border-white-50/30"
              >
                <img
                  src={`https://github.com/${o}.png`}
                  alt=""
                  className="h-[14px] w-[14px] rounded-sm object-contain"
                  loading="lazy"
                />
                {o}
              </a>
            );
          })}
        </div>
      )}

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
              <li
                key={p.url}
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
              </li>
            ))}
            {oss.reviews.slice(0, 4).map((r) => (
              <li key={r.url} className="gh-oss-row">
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

export default GitHubCard;
