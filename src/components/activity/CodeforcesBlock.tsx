import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { CodeforcesActivity } from "../../lib/activity";

const PROFILE_URL = "https://codeforces.com/profile/sachinapr20";

const CodeforcesMark = ({ className = "size-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#2980b9"
      d="M4.5 9a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-3 0V10.5A1.5 1.5 0 0 1 4.5 9z"
    />
    <path
      fill="#f1c40f"
      d="M12 4a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-3 0V5.5A1.5 1.5 0 0 1 12 4z"
    />
    <path
      fill="#e84118"
      d="M19.5 13a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-3 0v-5.5a1.5 1.5 0 0 1 1.5-1.5z"
    />
  </svg>
);

/* Minimal SVG sparkline of rating over recent contests — no charting lib. */
const RatingGraph = ({ contests }: { contests: CodeforcesActivity["contests"] }) => {
  const points = contests.slice(-8);
  if (points.length < 2) return null;

  const ratings = points.map((c) => c.newRating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = maxR - minR || 1;

  const width = 260;
  const height = 72;
  const padY = 26;
  const step = width / (points.length - 1);

  const path = points
    .map((c, i) => {
      const x = i * step;
      const y = height - padY - ((c.newRating - minR) / range) * (height - padY * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const change = last.newRating - first.newRating;

  return (
    <section className="flex flex-col gap-2 border-t border-black-50 pt-4">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white-50/55">
        <span>Rating graph</span>
        <span>
          {change >= 0 ? "+" : ""}{change.toLocaleString("en-US")}
        </span>
      </div>
      <svg
        width={width}
        height={height}
        className="block text-[var(--nav-accent)]"
        aria-label="Codeforces rating over recent contests"
        role="img"
      >
        <defs>
          <linearGradient id="cf-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--nav-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--nav-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill="url(#cf-grad)"
          stroke="var(--nav-accent)"
          strokeWidth="2"
          fillOpacity="0.12"
          className="transition-all duration-300"
        />
        {points.map((c, i) => {
          const x = i * step;
          const y = height - padY - ((c.newRating - minR) / range) * (height - padY * 2);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3}
              fill="var(--nav-accent)"
              stroke="var(--flip-black-100)"
              strokeWidth="1.5"
            />
          );
        })}
        {/* baseline + min/max labels */}
        <line
          x1={0}
          y1={height - padY}
          x2={width}
          y2={height - padY}
          stroke="var(--flip-black-50)"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
        <text x={4} y={padY - 8} fontSize="9" fill="var(--flip-white-50)" fillOpacity="0.5">
          {maxR.toLocaleString("en-US")}
        </text>
        <text x={4} y={height - 8} fontSize="9" fill="var(--flip-white-50)" fillOpacity="0.5">
          {minR.toLocaleString("en-US")}
        </text>
      </svg>
      <div className="flex justify-between px-1 text-[9px] text-white-50/45">
        {points.map((_, i) => (
          <span key={i} style={{ flexBasis: `${(100 / (points.length - 1)).toFixed(1)}%` }} />
        ))}
      </div>
    </section>
  );
};

/** Compact Codeforces snapshot shown at the foot of the LeetCode card. */
const CodeforcesBlock = ({ data }: { data: CodeforcesActivity | null }) => {
  const contests = data?.contests ?? [];
  const recent = [...contests].slice(-2).reverse();
  const stats = [
    { label: "Rating", value: data?.rating },
    { label: "Peak", value: data?.maxRating },
    { label: "Contests", value: contests.length },
  ];

  return (
    <section className="flex flex-col gap-2 border-t border-black-50 pt-4">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white-50/55">
        <span className="flex min-w-0 items-center gap-1.5">
          <CodeforcesMark />
          Codeforces
          {data?.rank && (
            <span className="truncate rounded-full border border-black-50 bg-black-200/70 px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-white-50/55">
              {data.rank}
            </span>
          )}
        </span>
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex shrink-0 items-center gap-1 normal-case tracking-normal text-[10px] text-white-50/45 transition-colors hover:text-white-50"
        >
          View profile
          <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <a
            key={s.label}
            href={PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col justify-between rounded-lg border border-black-50 bg-black-200/70 px-3 py-2 transition-colors hover:border-white-50/30 hover:bg-black-200"
          >
            <div className="text-base font-semibold tabular-nums text-white-50">
              {s.value == null ? "—" : s.value.toLocaleString("en-US")}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white-50/55">
              {s.label}
            </div>
          </a>
        ))}
      </div>

      {contests.length >= 2 ? <RatingGraph contests={contests} /> : null}

      <div className="mt-1 flex items-center justify-between text-[10px] text-white-50/40">
        <span>Recent contests</span>
        <span>rank · rating change</span>
      </div>

      {recent.length > 0 ? (
        <ul className="flex flex-col">
          {recent.map((c) => {
            const change = c.newRating - c.oldRating;
            return (
              <li key={`${c.name}-${c.at}`}>
                <motion.a
                  href={PROFILE_URL}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ x: 2 }}
                  className="group flex items-center justify-between gap-2 rounded-md px-1 py-1 text-[11px] transition-colors hover:bg-black-200/60"
                  title={`${c.name} — rank ${c.rank.toLocaleString()}, ${change >= 0 ? "+" : ""}${change} rating`}
                >
                  <span className="truncate text-white-50/60 transition-colors group-hover:text-white-50/85">
                    {c.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums text-[10px]">
                    <span className="text-white-50/40">
                      #{c.rank.toLocaleString("en-US")}
                    </span>
                    <span className={change >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {change >= 0 ? "+" : ""}
                      {change}
                    </span>
                  </span>
                </motion.a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[10px] text-white-50/40">No rated contests yet.</p>
      )}
    </section>
  );
};

export default CodeforcesBlock;
