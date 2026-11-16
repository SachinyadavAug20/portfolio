import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileText,
  Home,
  Keyboard,
  Link2,
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
    /* the navbar ⌘K chip opens the palette without faking a keypress */
    const onChip = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    window.addEventListener("palette-open", onChip);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("palette-open", onChip);
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

  /* the cat has an opinion about the search box */
  useEffect(() => {
    if (open) window.dispatchEvent(new Event("palette-opened"));
  }, [open]);

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
      {
        id: "links",
        label: "All My Links",
        hint: "/links",
        icon: Link2,
        run: () => navigate("/links"),
      },
    ];
    const jumps: PaletteItem[] = [
      ...ANCHOR_SECTIONS.map((t) => ({
        id: `anchor-${t}`,
        label: t.charAt(0).toUpperCase() + t.slice(1),
        hint: `/#${t}`,
        icon: ArrowRight,
        run: () => goAnchor(t),
      })),
      {
        id: "schedule",
        label: "Schedule a Meeting (Cal.com)",
        hint: "/#schedule",
        icon: Calendar,
        run: () => {
          const wasHome = window.location.pathname === "/";
          navigate({ pathname: "/", hash: "#schedule" });
          const scroll = () => {
            const el = document.getElementById("contact");
            if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
          };
          if (wasHome) requestAnimationFrame(scroll);
          else setTimeout(scroll, 450);
        },
      },
    ];
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
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black-800/60 px-6 pt-[16vh] backdrop-blur-md sm:pt-[20vh]"
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
      <div className="w-full max-w-[600px] overflow-hidden rounded-[20px] border border-white/10 bg-black/45 backdrop-blur-2xl shadow-2xl shadow-black/80">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 pt-4 pb-3">
          <div className="relative size-5 shrink-0 text-white/30">
            <Search className="size-5 shrink-0" />
            <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
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
            className="w-full bg-transparent py-2 text-base font-medium text-white placeholder-white/30 focus:outline-none"
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
          <kbd className="hidden rounded-md border border-white/20 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/40 sm:block">
            esc
          </kbd>
        </div>
        <div
          id="palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Results"
          className="max-h-[62vh] overflow-y-auto p-3"
        >
          {visibleSections.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-white/40">
              {notes ? "No matches." : "No matches. (notes still loading…)"}
            </p>
          )}
          {visibleSections.map((sec) => (
            <div key={sec.name} className="mb-2 last:mb-0">
              <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
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
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-blue-500/20 text-blue-50 shadow-sm"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex size-6 items-center justify-center rounded-lg shrink-0 transition-colors duration-150">
                      <Icon
                        className={`size-4 shrink-0 ${
                          isActive ? "text-blue-400" : "text-white/50"
                        }`}
                      />
                    </div>
                    <span className="truncate font-medium">{item.label}</span>
                    {item.hint && (
                      <span className="ml-auto shrink-0 text-xs font-mono text-white/40">
                        {item.hint}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-[11px] font-medium text-white/40">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/40">↑↓</kbd>
            <span className="text-white/30">move</span>
            <span className="mx-1 text-white/20">·</span>
            <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/40">↵</kbd>
            <span className="text-white/30">open</span>
            <span className="mx-1 text-white/20">·</span>
            <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/40">esc</kbd>
            <span className="text-white/30">close</span>
          </span>
          {notes && (
            <span className="text-white/30">
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
