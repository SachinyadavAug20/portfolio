import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { GITHUB_REPO, GITHUB_REPO_URL } from "../../constants";
import { tap } from "../lib/haptics";

const CACHE_KEY = "gh-star-count";
const TTL_MS = 60 * 60 * 1000;

interface CachedCount {
  v: number;
  t: number;
}

const readCache = (): number | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCount;
    if (typeof parsed.v !== "number") return null;
    if (Date.now() - parsed.t > TTL_MS) return null;
    return parsed.v;
  } catch {
    return null;
  }
};

const writeCache = (v: number) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ v, t: Date.now() }));
  } catch {
    // storage may be unavailable (private mode) — count is optional
  }
};

// Mobile-only repo pill that sits where the hamburger used to be — the bottom
// tab bar already covers navigation on small screens.
const GitHubStar = () => {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apply = (v: number) => {
      if (!cancelled) setStars(v);
    };
    const cached = readCache();
    if (cached !== null) {
      Promise.resolve().then(() => apply(cached));
      return () => {
        cancelled = true;
      };
    }
    fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
      .then((data: { stargazers_count?: number }) => {
        if (typeof data.stargazers_count !== "number") return;
        writeCache(data.stargazers_count);
        apply(data.stargazers_count);
      })
      .catch(() => {
        // offline / rate-limited — pill still works as a plain repo link
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      className="gh-star"
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noreferrer"
      title="Star the portfolio repo on GitHub"
      onClick={() => tap(8)}
    >
      <SiGithub size={17} aria-hidden="true" />
      <span className="gh-star-count">
        <Star size={11} className="fill-current" strokeWidth={0} aria-hidden="true" />
        {stars !== null ? stars : "Star"}
      </span>
    </a>
  );
};

export default GitHubStar;
