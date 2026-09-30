import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, themeSettings } from "../lib/theme";
import { tap } from "../lib/haptics";

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
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const focusItem = (i: number) => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]',
    );
    if (!items?.length) return;
    items[((i % items.length) + items.length) % items.length].focus();
  };

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) btnRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    focusItem(0);
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ) ?? [],
    );
    const current = items.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(current + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(current - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(items.length - 1);
    }
  };

  return (
    <div ref={ref} className="theme-toggle relative">
      <motion.button
        ref={btnRef}
        type="button"
        className="theme-toggle-btn"
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 650, damping: 30 }}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
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
      </motion.button>

      {open && (
        <div
          ref={menuRef}
          className="theme-toggle-menu"
          role="menu"
          onKeyDown={onMenuKeyDown}
        >
          {themeSettings.map((setting) => {
            const Icon = ICONS[setting];
            return (
              <button
                key={setting}
                type="button"
                role="menuitem"
                className="theme-toggle-item"
                onClick={() => {
                  tap(8);
                  setTheme(setting);
                  close();
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
