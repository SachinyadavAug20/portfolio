import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import TitleHeader from "../components/TitleHeader";
import GitHubCard from "../components/activity/GitHubCard";
import LeetCodeCard from "../components/activity/LeetCodeCard";
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

/** One shimmering placeholder shaped roughly like a card. */
const CardSkeleton = ({ tall = false }: { tall?: boolean }) => (
  <div
    className={`card-border rounded-xl p-6 ${tall ? "min-h-[560px]" : "min-h-[420px]"}`}
    aria-hidden
  >
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="skeleton size-10 rounded-full bg-black-200" />
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-24 rounded bg-black-200" />
          <div className="skeleton h-3 w-32 rounded bg-black-200" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-16 rounded-lg bg-black-200" />
        ))}
      </div>
      <div className="skeleton h-32 rounded-lg bg-black-200" />
      <div className="skeleton h-20 rounded-lg bg-black-200" />
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
    Promise.allSettled([
      fetchGithubActivity(),
      fetchLeetCodeActivity(),
      fetchGithubOss(),
    ]).then(([g, l, o]) => {
      if (g.status === "fulfilled") setGh(g.value);
      if (l.status === "fulfilled") setLc(l.value);
      if (o.status === "fulfilled") setOss(o.value);
      setStatus(
        g.status === "fulfilled" || l.status === "fulfilled"
          ? "ready"
          : "error",
      );
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
              <CardSkeleton tall />
              <CardSkeleton tall />
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
                <div className="card-border flex items-center justify-center rounded-xl p-6 text-sm text-white-50/55 min-h-[420px]">
                  GitHub contributions unavailable
                  <button
                    type="button"
                    onClick={retry}
                    className="skeleton-retry"
                  >
                    Retry
                  </button>
                </div>
              )}
              {lc ? (
                <LeetCodeCard data={lc} />
              ) : (
                <div className="card-border flex items-center justify-center rounded-xl p-6 text-sm text-white-50/55 min-h-[560px]">
                  LeetCode stats unavailable
                  <button
                    type="button"
                    onClick={retry}
                    className="skeleton-retry"
                  >
                    Retry
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Activity;
