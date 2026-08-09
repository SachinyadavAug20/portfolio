import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, themeSettings } from "../lib/theme";

const LABELS: Record<string, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const ICONS: Record<string, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="theme-toggle relative">
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="theme-toggle-sun">
          <Sun className="size-5" />
        </span>
        <span className="theme-toggle-moon">
          <Moon className="size-5" />
        </span>
        <span className="sr-only">
          {LABELS[theme]} theme ({resolvedTheme})
        </span>
      </button>

      {open && (
        <div className="theme-toggle-menu" role="menu">
          {themeSettings.map((setting) => {
            const Icon = ICONS[setting];
            return (
              <button
                key={setting}
                type="button"
                role="menuitem"
                className="theme-toggle-item"
                onClick={() => {
                  setTheme(setting);
                  setOpen(false);
                }}
              >
                <Icon className="size-4" />
                <span>{LABELS[setting]}</span>
                {theme === setting && <span className="theme-toggle-check">•</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
