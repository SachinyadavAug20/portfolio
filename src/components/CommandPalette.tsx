import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Home,
  Keyboard,
  Network,
  Palette,
  Search,
} from "lucide-react";
import { scrollToY } from "../lib/smoothScroll";
import { useTheme } from "../lib/theme";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Home;
  run: () => void;
}

interface Section {
  name: string;
  items: PaletteItem[];
}

const ANCHOR_SECTIONS = ["work", "experience", "skills", "contact"];

const CommandPalette = () => {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [notes, setNotes] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* "/" opens the palette everywhere except /blog, which owns "/" for its
     inline search. Cmd/Ctrl+K opens it anywhere (typing included).
     Reads window.location — React's rendered location can lag during view
     transitions. Back/forward closes the palette (backdrop already blocks
     pointer navigation while open). */
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "Escape" && openRef.current) {
        /* works even if the input hasn't received focus yet */
        e.preventDefault();
        setOpen(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (k !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable)
      )
        return;
      const path = window.location.pathname;
      if (path === "/blog" || path.startsWith("/blog/")) return;
      e.preventDefault();
      setOpen(true);
    };
    const onPop = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  /* reset state on open — adjusted during render (the React-recommended
     alternative to setState-in-effect). No close-on-navigation: the
     backdrop swallows clicks and in-palette navigation closes explicitly,
     and the rendered location may lag real navigation. */
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }

  /* lazily pull the note list the first time the palette opens */
  useEffect(() => {
    if (!open || notes) return;
    let alive = true;
    fetch("/blog-tree.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (alive && Array.isArray(data))
          setNotes(data.filter((n): n is string => typeof n === "string"));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open, notes]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

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

  const sections: Section[] = useMemo(() => {
    const pages: PaletteItem[] = [
      {
        id: "home",
        label: "Home",
        hint: "/",
        icon: Home,
        run: () => navigate("/"),
      },
      {
        id: "blog",
        label: "Blog",
        hint: "/blog",
        icon: BookOpen,
        run: () => navigate("/blog"),
      },
      {
        id: "graph",
        label: "Knowledge Graph",
        hint: "/graph",
        icon: Network,
        run: () => navigate("/graph"),
      },
    ];
    const jumps: PaletteItem[] = ANCHOR_SECTIONS.map((t) => ({
      id: `anchor-${t}`,
      label: t.charAt(0).toUpperCase() + t.slice(1),
      hint: `/#${t}`,
      icon: ArrowRight,
      run: () => goAnchor(t),
    }));
    const actions: PaletteItem[] = [
      {
        id: "theme",
        label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`,
        hint: "t",
        icon: Palette,
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        hint: "?",
        icon: Keyboard,
        run: () =>
          window.dispatchEvent(new CustomEvent("show-shortcuts-help")),
      },
    ];
    const noteItems: PaletteItem[] = (notes ?? []).map((path) => ({
      id: `note-${path}`,
      label: path.split("/").pop() ?? path,
      hint: path.split("/").slice(0, -1).join(" / "),
      icon: FileText,
      run: () => navigate(`/blog/post/${path}`),
    }));
    return [
      { name: "Pages", items: pages },
      { name: "Jump to", items: jumps },
      { name: "Actions", items: actions },
      { name: "Notes", items: noteItems },
    ];
  }, [goAnchor, navigate, resolvedTheme, notes, setTheme]);

  /* filter into sections (notes only once typing) with stable flat indices */
  const visibleSections: {
    name: string;
    items: { item: PaletteItem; idx: number }[];
  }[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    let idx = 0;
    return sections
      .map((sec) => {
        if (sec.name === "Notes" && !q) return { name: sec.name, items: [] };
        const items = q
          ? sec.items.filter(
              (i) =>
                i.label.toLowerCase().includes(q) ||
                (i.hint ?? "").toLowerCase().includes(q),
            )
          : sec.items;
        return {
          name: sec.name,
          items: items.map((item) => ({ item, idx: idx++ })),
        };
      })
      .filter((s) => s.items.length > 0);
  }, [query, sections]);

  const flat = useMemo(
    () => visibleSections.flatMap((s) => s.items.map((i) => i.item)),
    [visibleSections],
  );

  const safeActive = flat.length ? Math.min(active, flat.length - 1) : 0;

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${safeActive}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [safeActive, open]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (flat.length ? (a + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[safeActive];
      if (item) {
        close();
        item.run();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black-900/70 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="command-palette"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-black-50 bg-black-200 shadow-2xl shadow-black-900/60">
        <div className="flex items-center gap-3 border-b border-black-50 px-4">
          <Search className="size-4 shrink-0 text-white-50/40" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search pages, sections, notes…"
            className="w-full bg-transparent py-4 text-base text-white-50 placeholder:text-white-50/30 focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={
              flat.length ? `palette-opt-${safeActive}` : undefined
            }
            aria-label="Search pages, sections, and notes"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded-md border border-black-50 bg-black-100 px-1.5 py-0.5 text-[10px] text-white-50/40 sm:block">
            esc
          </kbd>
        </div>
        <div
          id="palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Results"
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {visibleSections.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-white-50/50">
              {notes
                ? "No matches."
                : "No matches. (notes still loading…)"}
            </p>
          )}
          {visibleSections.map((sec) => (
            <div key={sec.name} className="mb-1 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white-50/35">
                {sec.name}
              </p>
              {sec.items.map(({ item, idx }) => {
                const Icon = item.icon;
                const isActive = idx === safeActive;
                return (
                  <div
                    key={item.id}
                    id={`palette-opt-${idx}`}
                    data-idx={idx}
                    role="option"
                    aria-selected={isActive}
                    onMouseMove={() => setActive(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      close();
                      item.run();
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-blue-500/15 text-blue-50"
                        : "text-white-50/80"
                    }`}
                  >
                    <Icon
                      className={`size-4 shrink-0 ${
                        isActive ? "text-blue-300" : "text-white-50/40"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.hint && (
                      <span className="ml-auto shrink-0 text-xs text-white-50/35">
                        {item.hint}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-black-50 px-4 py-2 text-[11px] text-white-50/40">
          <span>
            <kbd className="rounded border border-black-50 px-1">↑↓</kbd> move
            {" · "}
            <kbd className="rounded border border-black-50 px-1">↵</kbd> open
            {" · "}
            <kbd className="rounded border border-black-50 px-1">esc</kbd>{" "}
            close
          </span>
          {notes && (
            <span>
              {query.trim()
                ? `${flat.length} / ${notes.length} notes`
                : `${notes.length} notes`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
