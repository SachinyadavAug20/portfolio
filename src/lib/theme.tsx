import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";
export type ThemeSetting = Theme | "system";

export interface ThemeContextValue {
  theme: ThemeSetting;
  setTheme: (theme: ThemeSetting) => void;
  resolvedTheme: Theme;
  toggleTheme: (origin?: { x: number; y: number }) => void;
}

const STORAGE_KEY = "theme";

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function getInitialTheme(): ThemeSetting {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function applyTheme(resolved: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    "content",
    resolved === "dark"
      ? getComputedStyle(root).getPropertyValue("--background").trim() || "#0e0e10"
      : "#ffffff",
  );
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSetting>(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystemTheme(media.matches ? "light" : "dark");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: ThemeSetting) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  const resolvedTheme: Theme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const toggleTheme = useCallback(
    (origin?: { x: number; y: number }) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      const currentResolved = theme === "system" ? systemTheme : theme;
      const next: Theme = currentResolved === "dark" ? "light" : "dark";

      const x = origin?.x ?? (typeof window !== "undefined" ? window.innerWidth - 60 : 0);
      const y = origin?.y ?? 40;
      const endRadius = typeof window !== "undefined"
        ? Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
          )
        : 1000;

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Gecko / Firefox / Zen Browser does not support Web Animations API on ::view-transition-* pseudo-elements.
      // In these engines, document.startViewTransition + element.animate causes rendering freezes and screen splitting.
      const isGecko =
        typeof navigator !== "undefined" &&
        (/firefox|zen/i.test(navigator.userAgent) || !("chrome" in window));

      const supportsViewTransition =
        typeof document !== "undefined" &&
        "startViewTransition" in document &&
        !isGecko &&
        !prefersReducedMotion;

      if (!supportsViewTransition) {
        // Butter-smooth, hardware-accelerated CSS color cross-fade transition
        if (!prefersReducedMotion && typeof document !== "undefined") {
          const root = document.documentElement;
          root.classList.add("theme-transitioning");
          flushSync(() => {
            applyTheme(next);
            setTheme(next);
          });
          window.setTimeout(() => {
            root.classList.remove("theme-transitioning");
            isTransitioningRef.current = false;
          }, 360);
          return;
        }

        applyTheme(next);
        setTheme(next);
        isTransitioningRef.current = false;
        return;
      }

      // Chromium circular spread view transition
      try {
        const transition = (
          document as unknown as {
            startViewTransition: (cb: () => void) => {
              ready: Promise<void>;
              finished: Promise<void>;
            };
          }
        ).startViewTransition(() => {
          flushSync(() => {
            applyTheme(next);
            setTheme(next);
          });
        });

        transition.ready
          .then(() => {
            const clipPath = [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ];

            const anim = document.documentElement.animate(
              {
                clipPath,
              },
              {
                duration: 420,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                pseudoElement: "::view-transition-new(root)",
              },
            );

            anim.onfinish = () => {
              isTransitioningRef.current = false;
            };
          })
          .catch(() => {
            isTransitioningRef.current = false;
          });

        transition.finished.finally(() => {
          isTransitioningRef.current = false;
        });
      } catch {
        applyTheme(next);
        setTheme(next);
        isTransitioningRef.current = false;
      }
    },
    [theme, systemTheme, setTheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, resolvedTheme, toggleTheme }),
    [theme, setTheme, resolvedTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export const themeSettings = ["light", "dark", "system"] as const;
