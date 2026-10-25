import { useCallback, useEffect, useRef, useState } from "react";

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none)").matches;
}

/**
 * Returns a ref to attach to a container plus:
 * - `near`  – one-shot: becomes true the first time the element comes within
 *   `rootMargin` of the viewport (use it to defer mounting heavy scenes).
 * - `visible` – continuous: tracks whether the element is currently inside
 *   the rootMargin (use it to pause canvas frameloops while off-screen).
 */
export function useNearViewport<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "400px",
) {
  const [node, setNode] = useState<T | null>(null);
  const innerRef = useRef<T | null>(null);
  const [near, setNear] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const [visible, setVisible] = useState(true);

  const ref = useCallback((el: T | null) => {
    innerRef.current = el;
    (ref as unknown as { current: T | null }).current = el;
    setNode(el);
  }, []) as React.RefCallback<T> & { current: T | null };
  ref.current = innerRef.current;

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setNear(true);
          setVisible(entry.isIntersecting);
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, rootMargin]);

  return { ref, near, visible, setNear };
}
