import { useEffect, useRef, useState } from "react";

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none)").matches;
}

/**
 * Returns a ref to attach to a container and whether it is within
 * `rootMargin` of the viewport. Used to defer mounting heavy WebGL
 * scenes until the user actually scrolls near them.
 */
export function useNearViewport<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "400px",
) {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, rootMargin]);

  return { ref, near, setNear };
}
