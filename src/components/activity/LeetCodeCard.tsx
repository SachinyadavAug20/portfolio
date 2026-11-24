import { useRef } from "react";
import { motion } from "motion/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowUpRight, ArrowRight, Flame } from "lucide-react";
import Heatmap, { HeatmapLegend } from "./Heatmap";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { LeetCodeActivity } from "../../lib/activity";

const DIFFS = [
  { key: "easy" as const, label: "Easy", color: "var(--lc-easy)" },
  { key: "medium" as const, label: "Medium", color: "var(--lc-medium)" },
  { key: "hard" as const, label: "Hard", color: "var(--lc-hard)" },
];

const KNOWN_BADGE_IDS: Record<string, string> = {
  knight: "11006349",
  "200 days badge 2026": "10943306",
  "100 days badge 2026": "10552745",
  "50 days badge 2026": "10381652",
};

function getBadgeMedalUrl(
  badge: { id?: string; name: string; displayName: string; medalUrl?: string },
  username: string,
): string {
  if (badge.medalUrl) return badge.medalUrl;
  const key = (badge.displayName || badge.name).toLowerCase();
  const id =
    badge.id ||
    KNOWN_BADGE_IDS[key] ||
    Object.entries(KNOWN_BADGE_IDS).find(([k]) => key.includes(k))?.[1];
  if (id) {
    const isLevel = key.includes("knight") || key.includes("guardian");
    return `https://leetcode.com/medal/?showImg=0&id=${id}&isLevel=${isLevel ? "true" : "false"}`;
  }
  return `https://leetcode.com/u/${username}`;
}

/** Build an SVG polyline + area path from contest rating history. */
function ratingPaths(
  points: { rating: number }[],
  w: number,
  h: number,
): { line: string; area: string; min: number; max: number } {
  const min = Math.min(...points.map((p) => p.rating));
  const max = Math.max(...points.map((p) => p.rating));
  const span = max - min || 1;
  const x = (i: number) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => h - 4 - ((v - min) / span) * (h - 8);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(" ");
  return { line, area: `${line} L${w},${h} L0,${h} Z`, min, max };
}

const LeetCodeCard = ({ data }: { data: LeetCodeActivity }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { contest, questions, submissions, badges, histogram, profile } = data;
  const solvedPct = questions.all.total
    ? (questions.all.solved / questions.all.total) * 100
    : 0;

  /* which histogram bucket does this user's top-% fall into (for the marker) */
  const bucketIndex = histogram.findIndex(
    (b, i) =>
      b.topPercentage >= contest.topPercentage &&
      (i + 1 === histogram.length ||
        histogram[i + 1].topPercentage < contest.topPercentage),
  );
  const histMax = Math.max(...histogram.map((b) => b.userCount), 1);
  /* Bars need explicit pixel heights — a % height resolves to 0 because the
     flex-1 parents have no definite height, which is why the distribution
     was invisible. */
  const HIST_H = 80; // px, matches the h-20 container
  const histBars = histogram.map((b) => ({
    topPercentage: b.topPercentage,
    px: Math.max(3, Math.round((b.userCount / histMax) * HIST_H)),
  }));
  /* Est. global rank is an estimate (exact rank needs a session); shorten
     long numbers so they never run outside the box. */
  const rankText =
    contest.rank >= 1000 ? `${(contest.rank / 1000).toFixed(1)}K` : contest.rank.toLocaleString("en-US");

  const W = 320;
  const H = 84;
  const history = contest.history.length >= 2 ? contest.history : null;
  const paths = history ? ratingPaths(history, W, H) : null;

  useGSAP(
    () => {
      if (reduced) return;
      const scope = rootRef.current;
      if (!scope) return;

      /* count-ups */
      scope.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        const decimals = Number(el.dataset.decimals ?? 0);
        if (!Number.isFinite(target)) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.2,
          ease: "power2.out",
          delay: 0.15,
          onUpdate: () => {
            el.textContent = obj.val.toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            });
          },
          onComplete: () => {
            el.textContent = target.toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            });
          },
        });
      });

      /* solved ring sweep */
      const ring = scope.querySelector<SVGCircleElement>(".lc-ring-fg");
      if (ring) {
        const len = ring.getTotalLength();
        gsap.fromTo(
          ring,
          { strokeDasharray: `${len}`, strokeDashoffset: `${len}` },
          {
            strokeDashoffset: `${len * (1 - solvedPct / 100)}`,
            duration: 1.3,
            ease: "power2.inOut",
            delay: 0.2,
            scrollTrigger: { trigger: scope, start: "top 85%", once: true },
          },
        );
      }

      /* rating line draw */
      const line = scope.querySelector<SVGPathElement>(".lc-line");
      if (line) {
        const len = line.getTotalLength();
        gsap.fromTo(
          line,
          { strokeDasharray: `${len}`, strokeDashoffset: `${len}` },
          {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: "power2.inOut",
            delay: 0.35,
            scrollTrigger: { trigger: scope, start: "top 85%", once: true },
          },
        );
        gsap.fromTo(
          scope.querySelector(".lc-area"),
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.9,
            delay: 1,
            scrollTrigger: { trigger: scope, start: "top 85%", once: true },
          },
        );
      }

      /* difficulty bars grow from the left */
      gsap.fromTo(
        scope.querySelectorAll(".lc-diff-bar"),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
          transformOrigin: "left center",
          clearProps: "transform",
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );

      /* histogram bars grow up */
      gsap.fromTo(
        scope.querySelectorAll(".lc-hist-bar"),
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.025,
          transformOrigin: "bottom center",
          clearProps: "transform",
          scrollTrigger: { trigger: scope, start: "top 85%", once: true },
        },
      );
    },
    { scope: rootRef, dependencies: [reduced, solvedPct], revertOnUpdate: true },
  );

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="card-border relative flex flex-col gap-5 overflow-hidden rounded-xl p-5 sm:p-6"
    >
      {/* profile header */}
      <div className="flex items-start gap-3 flex-wrap min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={profile.avatar}
            alt={profile.name || profile.username}
            className="size-10 rounded-full border border-black-50 bg-black-200 object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 font-semibold leading-tight text-white-50">
              LeetCode
              {data.level && (
                <span className="rounded-full border border-[var(--lc-easy)]/40 bg-[var(--lc-easy)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--lc-easy)]">
                  {data.level}
                </span>
              )}
            </h3>
            <a
              href={`https://leetcode.com/u/${profile.username}`}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1 text-xs text-white-50/60 transition-colors hover:text-white-50"
            >
              {profile.name || profile.username}
              <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
        <div className="text-right min-w-0 sm:text-right">
          <div className="text-lg font-semibold tabular-nums leading-none text-white-50 sm:text-2xl overflow-hidden overflow-ellipsis whitespace-nowrap">
            <span data-count={contest.rating} data-decimals="1">0</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-white-50/55">
            Contest rating
          </div>
        </div>
      </div>

      {/* contest stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-lg border border-black-50 bg-black-200/70 px-3 py-2.5">
          <div className="text-lg font-semibold tabular-nums text-white-50">
            Top <span data-count={contest.topPercentage} data-decimals="2">0</span>%
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white-50/55">
            of {Math.round(contest.totalParticipants / 1000)}K participants
          </div>
        </div>
        <div className="rounded-lg border border-black-50 bg-black-200/70 px-3 py-2.5">
          <a
            href={`https://leetcode.com/u/${profile.username}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-lg font-semibold tabular-nums text-white-50 transition-colors hover:text-white-50"
          >
            #{rankText}
            <ArrowUpRight className="size-3" />
          </a>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white-50/55">
            est. global rank
          </div>
        </div>
        <div className="rounded-lg border border-black-50 bg-black-200/70 px-3 py-2.5">
          <div className="text-lg font-semibold tabular-nums text-white-50">
            <span data-count={contest.attended}>0</span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white-50/55">
            contests attended
          </div>
        </div>
      </div>

      {/* rating history sparkline */}
      {paths && (
        <div className="rounded-lg border border-black-50 bg-black-200/40 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white-50/55">
              Rating history
            </span>
            <span className="text-[11px] tabular-nums text-white-50/70">
              {Math.round(paths.min)} – {Math.round(paths.max)}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-20 w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Contest rating trend"
          >
            <path className="lc-area" d={paths.area} fill="var(--lc-rating)" opacity="0.14" />
            <path
              className="lc-line"
              d={paths.line}
              fill="none"
              stroke="var(--lc-rating)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}

      {/* solved ring + difficulties — spacious layout that never clips Medium/bars */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative size-16 shrink-0">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--lc-ring-track)"
                  strokeWidth="9"
                />
                <circle
                  className="lc-ring-fg"
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--lc-rating)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - solvedPct / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-semibold tabular-nums leading-none text-white-50">
                  <span data-count={questions.all.solved}>0</span>
                </span>
                <span className="text-[9px] text-white-50/50">
                  /{questions.all.total.toLocaleString("en-US")}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white-50/55">
                Solved
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-[11px] text-white-50/75">
                {DIFFS.map((d) => (
                  <span key={d.key} className="inline-flex items-center gap-1 font-medium">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    {questions[d.key].solved}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-white-50/50">
            <Flame className="size-3 text-[var(--lc-rating)]" />
            {questions.attempting} attempting
          </span>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 pt-1">
          {DIFFS.map((d) => {
            const q = questions[d.key];
            const pct = q.total ? (q.solved / q.total) * 100 : 0;
            return (
              <div key={d.key} className="flex items-center gap-2 text-xs">
                <span
                  className="w-14 shrink-0 font-medium text-[11px]"
                  style={{ color: d.color }}
                >
                  {d.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black-200">
                  <div
                    className="lc-diff-bar h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: d.color }}
                  />
                </div>
                <span className="shrink-0 text-right text-[11px] tabular-nums text-white-50/70 min-w-[64px]">
                  {q.solved} <span className="text-white-50/40">/ {q.total}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* rating distribution */}
      <div className="rounded-lg border border-black-50 bg-black-200/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white-50/55">
            Rating distribution
          </span>
          {bucketIndex >= 0 && (
            <span className="text-[11px] text-[var(--lc-rating)]">
              you are here · top {contest.topPercentage}%
            </span>
          )}
        </div>
        <div className="flex h-20 items-end gap-[3px]">
          {histBars.map((b, i) => (
            <motion.a
              key={i}
              href={`https://leetcode.com/u/${profile.username}`}
              target="_blank"
              rel="noreferrer"
              className="group relative flex-1"
              whileHover={{ scaleY: 1.15 }}
              style={{ transformOrigin: "bottom" }}
              title={`${Math.round(b.topPercentage)}% · ${histogram[i].userCount.toLocaleString("en-US")} users`}
            >
              <span
                className="lc-hist-bar block rounded-t-[2px] transition-opacity"
                style={{
                  height: b.px,
                  backgroundColor:
                    i === bucketIndex ? "var(--lc-rating)" : "var(--lc-hist)",
                  opacity: bucketIndex >= 0 && i !== bucketIndex ? 0.55 : 1,
                }}
              />
            </motion.a>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-white-50/45">
          <span>higher rated</span>
          <span>lower rated</span>
        </div>
      </div>

      {/* badges — LeetCode-style showcase with direct medal links */}
      {badges.length > 0 && (
        <div className="rounded-lg border border-black-50 bg-black-200/40 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white-50/55">
                Badges
              </div>
              <div className="text-lg font-semibold tabular-nums text-white-50">
                {badges.length}
              </div>
            </div>
            <a
              href={`https://leetcode.com/u/${profile.username}`}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1 text-xs text-white-50/60 transition-colors hover:text-white-50"
            >
              All Badges
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          <div className="my-3 grid grid-cols-4 gap-2 sm:gap-3">
            {badges.slice(0, 4).map((b) => {
              const medalUrl = getBadgeMedalUrl(b, profile.username);
              return (
                <motion.a
                  key={b.name + b.displayName}
                  href={medalUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`${b.displayName} · Click to view medal`}
                  whileHover={{ y: -3, scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className="group flex flex-col items-center justify-center rounded-lg border border-black-50/60 bg-black-200/60 p-2 transition-all hover:border-white-50/30 hover:bg-black-200"
                >
                  {b.icon ? (
                    <img
                      src={b.icon}
                      alt={b.displayName}
                      className="size-11 sm:size-12 object-contain drop-shadow transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-11 rounded bg-black-300" />
                  )}
                  <span className="mt-1 text-center text-[10px] text-white-50/60 line-clamp-1 group-hover:text-white-50 transition-colors">
                    {b.displayName.replace(/ 20\d\d$/, "")}
                  </span>
                </motion.a>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-black-50/60 pt-2 text-xs">
            <span className="text-[10px] text-white-50/50">Most Recent Badge</span>
            <a
              href={getBadgeMedalUrl(badges[0], profile.username)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-white-50 hover:underline"
            >
              {badges[0].displayName}
              <ArrowUpRight className="size-3 text-white-50/50" />
            </a>
          </div>
        </div>
      )}

      {/* submission heatmap */}
      <div className="flex flex-col gap-2 border-t border-black-50 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wider text-white-50/55">
            {submissions.total.toLocaleString("en-US")} submissions ·{" "}
            {submissions.activeDays} active days
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-white-50/70">
            <Flame className="size-3 text-[var(--lc-rating)]" />
            {submissions.maxStreak} max streak
          </span>
        </div>
        <Heatmap
          days={submissions.days}
          unit="submission"
          label="LeetCode"
          href={`https://leetcode.com/u/${profile.username}/`}
          getCellHref={() => `https://leetcode.com/u/${profile.username}/`}
        />
        <div className="flex items-center justify-between">
          <HeatmapLegend href={`https://leetcode.com/u/${profile.username}/`} />
          <span className="text-[10px] text-white-50/55">
            {submissions.days[0]?.date} → {submissions.days[submissions.days.length - 1]?.date}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default LeetCodeCard;
