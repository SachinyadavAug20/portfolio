import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import TitleHeader from "../components/TitleHeader";
import GitHubCard from "../components/activity/GitHubCard";
import LeetCodeCard from "../components/activity/LeetCodeCard";
import { HeatmapSkeleton } from "../components/activity/Heatmap";
import { useNearViewport } from "../hooks/useNearViewport";
import {
  fetchGithubActivity,
  fetchGithubOss,
  fetchLeetCodeActivity,
  invalidateActivity,
  type GithubActivity,
  type GithubOss,
  type LeetCodeActivity,
} from "../lib/activity";

type Status = "idle" | "loading" | "ready" | "error";

/** High-fidelity shimmering card placeholder with authentic calendar skeleton */
const CardSkeleton = ({
  tall = false,
  label = "GitHub",
}: {
  tall?: boolean;
  label?: string;
}) => (
  <div
    className={`card-border flex flex-col justify-between rounded-xl p-5 sm:p-6 ${
      tall ? "min-h-[580px]" : "min-h-[460px]"
    }`}
    aria-hidden
  >
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="skeleton size-10 rounded-full bg-black-200" />
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-28 rounded bg-black-200" />
          <div className="skeleton h-3 w-36 rounded bg-black-200" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-16 rounded-lg bg-black-200" />
        ))}
      </div>
      <div className="skeleton h-32 rounded-lg bg-black-200" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-9 rounded-lg bg-black-200" />
        ))}
      </div>
    </div>

    {/* Heatmap calendar skeleton — never looks blank or dead while fetching */}
    <div className="flex flex-col gap-2 border-t border-black-50 pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-40 rounded bg-black-200" />
        <div className="skeleton h-3 w-24 rounded bg-black-200" />
      </div>
      <HeatmapSkeleton label={label} />
      <div className="flex items-center justify-between pt-1">
        <div className="skeleton h-2.5 w-24 rounded bg-black-200" />
        <div className="skeleton h-2.5 w-32 rounded bg-black-200" />
      </div>
    </div>
  </div>
);

const Activity = () => {
  /* only fetch once the section is close to the viewport */
  const { ref, near } = useNearViewport<HTMLDivElement>("600px");
  const [status, setStatus] = useState<Status>("idle");
  const [gh, setGh] = useState<GithubActivity | null>(null);
  const [lc, setLc] = useState<LeetCodeActivity | null>(null);
  const [oss, setOss] = useState<GithubOss | null>(null);

  const load = useCallback(() => {
    setStatus("loading");

    // Fetch in parallel but settle progressively
    const pGh = fetchGithubActivity()
      .then((val) => {
        setGh(val);
        setStatus("ready");
      })
      .catch(() => null);

    const pLc = fetchLeetCodeActivity()
      .then((val) => {
        setLc(val);
        setStatus("ready");
      })
      .catch(() => null);

    const pOss = fetchGithubOss()
      .then((val) => {
        setOss(val);
      })
      .catch(() => null);

    Promise.allSettled([pGh, pLc, pOss]).then(([g, l]) => {
      if (g.status === "rejected" && l.status === "rejected") {
        setStatus("error");
      }
    });
  }, []);

  useEffect(() => {
    if (!near || status !== "idle") return;
    /* defer so setState runs after this effect returns (avoids cascading
       render per react-hooks/set-state-in-effect) */
    const raf = requestAnimationFrame(() => load());
    return () => cancelAnimationFrame(raf);
  }, [near, status, load]);

  const retry = () => {
    invalidateActivity("gh");
    invalidateActivity("lc");
    invalidateActivity("oss");
    load();
  };

  return (
    <section
      id="activity"
      ref={ref}
      className="relative z-10 clear-both w-full flex-center px-4 py-12 sm:px-6 sm:py-16 md:px-10"
    >
      <div className="h-full w-full md:px-10">
        <TitleHeader title="Activity" />

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 md:items-stretch">
          {status === "loading" || status === "idle" ? (
            <>
              <CardSkeleton tall label="GitHub" />
              <CardSkeleton tall label="LeetCode" />
            </>
          ) : status === "error" ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-border col-span-full flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center"
            >
              <p className="text-sm text-white-50/70">
                Couldn&apos;t reach GitHub or LeetCode right now.
              </p>
              <button type="button" onClick={retry} className="skeleton-retry">
                Retry
              </button>
            </motion.div>
          ) : (
            <>
              {gh ? (
                <GitHubCard data={gh} oss={oss} />
              ) : (
                <CardSkeleton tall label="GitHub" />
              )}
              {lc ? (
                <LeetCodeCard data={lc} />
              ) : (
                <CardSkeleton tall label="LeetCode" />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Activity;
