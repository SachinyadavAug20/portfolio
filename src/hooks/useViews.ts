import { useEffect, useState } from "react";

const SESSION_PREFIX = "viewed:";

export function useViews(slug: string | undefined) {
  const [views, setViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const key = SESSION_PREFIX + slug;
    const alreadyCounted = sessionStorage.getItem(key);
    const increment = alreadyCounted ? "" : "?increment=1";

    fetch(`/api/views/${encodeURIComponent(slug)}${increment}`)
      .then((r) => r.json())
      .then((data) => {
        setViews(data.views);
        if (!alreadyCounted) {
          sessionStorage.setItem(key, "1");
        }
      })
      .catch(() => {
        setViews(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return { views, loading };
}
