import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard, X } from "lucide-react";
import { scrollToY } from "../lib/smoothScroll";
import { useTheme } from "../lib/theme";

const G_TIMEOUT_MS = 1200;

const isTyping = () => {
  const el = document.activeElement;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      (el as HTMLElement).isContentEditable)
  );
};

const ShortcutRow = ({ keys, desc }: { keys: string; desc: string }) => (
  <div className="flex items-center justify-between gap-6 py-1.5">
    <span className="text-sm text-white-50/70">{desc}</span>
    <kbd className="shrink-0 rounded-md border border-black-50 bg-black-100 px-1.5 py-0.5 text-xs text-white-50/60">
      {keys}
    </kbd>
  </div>
);

const DevShortcuts = () => {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  const gRef = useRef<number | null>(null);

  const goAnchor = useCallback(
    (target: string) => {
      const wasHome = window.location.pathname === "/";
      navigate({ pathname: "/", hash: `#${target}` });
      const scroll = () => {
        const el = document.getElementById(target);
        if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
      };
      if (wasHome) requestAnimationFrame(scroll);
      else setTimeout(scroll, 450);
    },
    [navigate],
  );

  const disarmG = () => {
    if (gRef.current) {
      window.clearTimeout(gRef.current);
      gRef.current = null;
    }
  };

  /* the palette can open the help sheet from its Actions section */
  useEffect(() => {
    const onShow = () => setHelpOpen(true);
    window.addEventListener("show-shortcuts-help", onShow);
    return () => window.removeEventListener("show-shortcuts-help", onShow);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;

      if (helpOpen) {
        if (k === "Escape" || k === "?") {
          e.preventDefault();
          setHelpOpen(false);
        }
        return;
      }

      if (isTyping()) return;

      if (k === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (k === "Escape") {
        disarmG();
        return;
      }
      if (k === "t") {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        return;
      }

      /* vim-style g-prefix sequences: g h / g b / g p / g g / g c */
      if (gRef.current) {
        disarmG();
        switch (k) {
          case "h":
            navigate("/");
            break;
          case "b":
            navigate("/blog");
            break;
          case "p":
            navigate("/graph");
            break;
          case "c":
            goAnchor("contact");
            break;
          case "g":
            scrollToY(0);
            break;
          default:
            break;
        }
        return;
      }
      if (k === "g") {
        gRef.current = window.setTimeout(disarmG, G_TIMEOUT_MS);
      }
    };
    window.addEventListener("keydown", onKey);
    /* no disarmG here: deps changing (e.g. the rendered location catching
       up after navigation) must not eat a pending g-sequence */
    return () => window.removeEventListener("keydown", onKey);
  }, [goAnchor, helpOpen, navigate, resolvedTheme, setTheme]);

  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black-900/70 px-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setHelpOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      data-testid="shortcuts-help"
    >
      <div className="w-full max-w-md rounded-2xl border border-black-50 bg-black-200 p-5 shadow-2xl shadow-black-900/60">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white-50">
            <Keyboard className="size-4 text-blue-300" />
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            aria-label="Close shortcuts"
            onClick={() => setHelpOpen(false)}
            className="rounded-full p-1.5 text-white-50/40 transition-colors hover:bg-black-100 hover:text-white-50"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="divide-y divide-black-50/70">
          <div className="pb-2">
            <p className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-white-50/35">
              Search
            </p>
            <ShortcutRow keys="Ctrl / ⌘ + K" desc="Command palette" />
            <ShortcutRow keys="/" desc="Palette (blog focuses search)" />
          </div>
          <div className="py-2">
            <p className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-white-50/35">
              Go
            </p>
            <ShortcutRow keys="g h" desc="Home" />
            <ShortcutRow keys="g b" desc="Blog" />
            <ShortcutRow keys="g p" desc="Knowledge graph" />
            <ShortcutRow keys="g g" desc="Back to top" />
            <ShortcutRow keys="g c" desc="Contact" />
          </div>
          <div className="py-2">
            <p className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-white-50/35">
              General
            </p>
            <ShortcutRow keys="t" desc="Toggle theme" />
            <ShortcutRow keys="?" desc="This help" />
            <ShortcutRow keys="Esc" desc="Close overlays" />
          </div>
          <div className="pt-2">
            <p className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-white-50/35">
              The cat
            </p>
            <ShortcutRow keys="Alt + C" desc="Show / shoo the cat" />
            <ShortcutRow keys="pspsps" desc="Call the cat to your cursor" />
            <ShortcutRow keys="a" desc="Open the cat's suggestion" />
            <ShortcutRow keys="d" desc="Skip the cat's suggestion" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevShortcuts;
