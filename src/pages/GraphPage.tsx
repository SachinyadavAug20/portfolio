import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  FolderOpen,
  Maximize2,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import type {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import SEOHead from "../seo/SEOHead";
import TitleHeader from "../components/TitleHeader";
import { useTheme } from "../lib/theme";
import { useNearViewport, isTouchDevice } from "../hooks/useNearViewport";
import { tap } from "../lib/haptics";

/* react.lazy erases generic call signatures (props fall back to NodeType={}).
   Re-assert the package's generic component type; JSX passes explicit args. */
const ForceGraph2D = lazy(
  () => import("react-force-graph-2d"),
) as unknown as typeof import("react-force-graph-2d").default;

/* ── data shape (mirrors public/graph.json) ───────────────────────────── */

type NoteKind = "note" | "folder";

interface GraphNodeData {
  id: string;
  title: string;
  kind: NoteKind;
  dir?: string;
  path?: string;
  // populated at runtime by the force engine
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface GraphLinkData {
  kind: "wiki" | "member" | "parent";
}

interface GraphData {
  generatedAt: string;
  counts: { notes: number; folders: number; links: number; wikiLinks: number };
  nodes: GraphNodeData[];
  links: LinkObject<GraphNodeData, GraphLinkData>[];
}

type FgNode = NodeObject<GraphNodeData>;
type FgLink = LinkObject<GraphNodeData, GraphLinkData>;

/* ── helpers ──────────────────────────────────────────────────────────── */

let cachedGraph: GraphData | null = null;

const sid = (v: string | number | FgNode | undefined): string => {
  if (v == null) return "";
  return typeof v === "object" ? String(v.id ?? "") : String(v);
};

const topOf = (n: GraphNodeData): string => {
  const p = n.kind === "folder" ? (n.path ?? "") : (n.dir ?? "");
  return p ? p.split("/")[0] : "Other";
};

const truncate = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(128,128,128,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const PALETTE = [
  "#38bdf8", // Programing
  "#a78bfa", // Tools
  "#34d399", // Daily Diary
  "#fbbf24", // MIT lectures
  "#f472b6", // lectures
  "#60a5fa",
  "#fb923c",
  "#2dd4bf",
];
const PREFERRED_TOPS = [
  "Programing",
  "Tools",
  "Daily Diary",
  "MIT lectures",
  "lectures",
];

/* ── page ─────────────────────────────────────────────────────────────── */

const GraphPage = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const isTouch = useMemo(() => isTouchDevice(), []);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    cachedGraph ? "ready" : "loading",
  );
  const [data, setData] = useState<GraphData | null>(cachedGraph);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTop, setActiveTop] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });

  const boxRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<
    ForceGraphMethods<FgNode, FgLink> | undefined
  >(undefined);
  const { ref: viewRef, visible } = useNearViewport<HTMLDivElement>("80px");

  /* data loading (module-cached; fresh JSON on every deploy).
     First mount starts in "loading"; Retry flips status in its click handler. */
  useEffect(() => {
    if (cachedGraph) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/graph.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as GraphData;
        if (!alive) return;
        cachedGraph = json;
        setData(json);
        setStatus("ready");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt]);

  /* canvas box measurement */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* pause the render loop while the section is off-screen */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || status !== "ready") return;
    if (visible) fg.resumeAnimation();
    else fg.pauseAnimation();
  }, [visible, status]);

  /* escape clears the selection */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* derivations ------------------------------------------------------- */

  const degreeMap = useMemo(() => {
    const m = new Map<string, number>();
    data?.links.forEach((l) => {
      const s = sid(l.source);
      const t = sid(l.target);
      if (s) m.set(s, (m.get(s) ?? 0) + 1);
      if (t) m.set(t, (m.get(t) ?? 0) + 1);
    });
    return m;
  }, [data]);

  const tops = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.nodes.forEach((n) => set.add(topOf(n)));
    return [...set].sort((a, b) => {
      const ia = PREFERRED_TOPS.indexOf(a);
      const ib = PREFERRED_TOPS.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [data]);

  const topColor = useMemo(() => {
    const m = new Map<string, string>();
    tops.forEach((t, i) => m.set(t, PALETTE[i % PALETTE.length]));
    return m;
  }, [tops]);

  /* theme-reactive canvas palette (read once per theme change) */
  const tc = useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string, fb: string) =>
      cs.getPropertyValue(name).trim() || fb;
    const light = resolvedTheme === "light";
    return {
      edge: light ? "#0a0a0a" : v("--flip-white-50", "#d9ecff"),
      edgeA: light ? 0.13 : 0.14,
      edgeHotA: light ? 0.5 : 0.55,
      faintA: 0.05,
      accent: v("--tab-accent", "#38bdf8"),
      wikiA: light ? 0.7 : 0.6,
      wikiHotA: 1,
      dimA: light ? 0.1 : 0.15,
      label: v("--flip-blue-50", "#839cb5"),
      labelStrong: v("--flip-white-50", "#d9ecff"),
    };
  }, [resolvedTheme]);

  const filtered = useMemo(() => {
    if (!data) return null;
    if (!activeTop) return data;
    const nodes = data.nodes.filter((n) => topOf(n) === activeTop);
    const keep = new Set(nodes.map((n) => n.id));
    const links = data.links.filter(
      (l) => keep.has(sid(l.source)) && keep.has(sid(l.target)),
    );
    return { ...data, nodes, links };
  }, [data, activeTop]);

  const selection = useMemo(() => {
    if (!selectedId || !filtered) return null;
    const ids = new Set<string>([selectedId]);
    for (const l of filtered.links) {
      const s = sid(l.source);
      const t = sid(l.target);
      if (s === selectedId) ids.add(t);
      else if (t === selectedId) ids.add(s);
    }
    return { ids };
  }, [selectedId, filtered]);

  const selectedNode = useMemo(
    () => data?.nodes.find((n) => n.id === selectedId) ?? null,
    [data, selectedId],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !filtered) return [];
    const out: GraphNodeData[] = [];
    for (const n of filtered.nodes) {
      const hay = `${n.title} ${n.path ?? n.dir ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push(n);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [query, filtered]);

  /* actions ----------------------------------------------------------- */

  const radiusOf = useCallback(
    (n: GraphNodeData) => {
      const deg = degreeMap.get(n.id) ?? 0;
      const base = n.kind === "folder" ? 3.5 : 4.5;
      return base + Math.min(deg, 15) * 0.32;
    },
    [degreeMap],
  );

  const openNode = useCallback(
    (n: GraphNodeData) => {
      tap(12);
      if (n.kind === "folder") {
        navigate(`/blog?path=${encodeURIComponent(n.path ?? "")}`);
      } else {
        navigate(`/blog/post/${n.id}`);
      }
    },
    [navigate],
  );

  const handleNodeClick = useCallback(
    (n: FgNode) => {
      const id = n.id ?? null;
      if (id && id === selectedId) {
        openNode(n as GraphNodeData);
        return;
      }
      tap(8);
      setSelectedId(id);
    },
    [selectedId, openNode],
  );

  const flyTo = useCallback(
    (n: GraphNodeData) => {
      setSelectedId(n.id);
      setQuery("");
      tap(8);
      const fg = fgRef.current;
      if (!fg || n.x == null || n.y == null) return;
      const dur = reduced ? 0 : 700;
      fg.centerAt(n.x, n.y, dur);
      fg.zoom(Math.max(fg.zoom(), 2.2), dur);
    },
    [reduced],
  );

  /* stable handler (no per-item closures over render values) */
  const handleMatchClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const id = e.currentTarget.dataset.id;
      if (!id || !filtered) return;
      const n = filtered.nodes.find((x) => x.id === id);
      if (n) flyTo(n);
    },
    [filtered, flyTo],
  );

  const zoomBy = useCallback((factor: number) => {
    const fg = fgRef.current;
    if (!fg) return;
    const next = Math.min(Math.max(fg.zoom() * factor, 0.05), 8);
    fg.zoom(next, reduced ? 0 : 250);
  }, [reduced]);

  const fitToView = useCallback(() => {
    fgRef.current?.zoomToFit(reduced ? 0 : 350, 56);
  }, [reduced]);

  const resetLayout = useCallback(() => {
    filtered?.nodes.forEach((n) => {
      delete n.fx;
      delete n.fy;
    });
    fgRef.current?.d3ReheatSimulation();
    tap(8);
  }, [filtered]);

  /* force engine tuning (after the canvas mounts) */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || status !== "ready") return;
    const charge = fg.d3Force("charge") as unknown as
      | { strength(v: number): void; distanceMax(v: number): void }
      | undefined;
    charge?.strength(-160);
    charge?.distanceMax(700);
    const link = fg.d3Force("link") as unknown as
      | { distance(fn: (l: FgLink) => number): void }
      | undefined;
    link?.distance((l) => (l.kind === "wiki" ? 36 : 26));
  }, [status]);

  /* frame the whole graph on load and whenever the filter changes */
  useEffect(() => {
    if (status !== "ready" || !size.w) return;
    const t = window.setTimeout(() => {
      fgRef.current?.zoomToFit(reduced ? 0 : 600, 56);
    }, 160);
    return () => window.clearTimeout(t);
  }, [status, size.w, reduced, activeTop]);

  /* rendering --------------------------------------------------------- */

  const paintNode = useCallback(
    (n: FgNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const id = n.id ?? "";
      const isSel = selectedId === id;
      const dim = selection ? !selection.ids.has(id) : false;
      const r = radiusOf(n);
      const color = topColor.get(topOf(n)) ?? "#94a3b8";
      const x = n.x ?? 0;
      const y = n.y ?? 0;

      ctx.globalAlpha = dim ? tc.dimA : 1;

      if (n.kind === "folder") {
        ctx.beginPath();
        ctx.roundRect(x - r, y - r, r * 2, r * 2, r * 0.45);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      if (isSel) {
        ctx.beginPath();
        ctx.arc(x, y, r + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = tc.accent;
        ctx.lineWidth = 1.75 / globalScale;
        ctx.stroke();
      }

      const deg = degreeMap.get(id) ?? 0;
      const showLabel =
        !dim &&
        (globalScale > 0.9 ||
          isSel ||
          (selection != null && selection.ids.has(id)) ||
          (n.kind === "folder" && globalScale > 0.45) ||
          (deg >= 25 && globalScale > 0.6));

      if (showLabel) {
        const fontSize = Math.max(11 / globalScale, 3);
        ctx.font = `${n.kind === "folder" ? 600 : 500} ${fontSize}px "Geist Variable", Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = n.kind === "folder" ? tc.labelStrong : tc.label;
        ctx.fillText(
          truncate(n.title, n.kind === "folder" ? 24 : 20),
          x,
          y + r + 3 / globalScale,
        );
      }

      ctx.globalAlpha = 1;
    },
    [selectedId, selection, radiusOf, topColor, tc, degreeMap],
  );

  const linkColor = useCallback(
    (l: FgLink) => {
      const s = sid(l.source);
      const t = sid(l.target);
      const touches =
        selectedId != null && (s === selectedId || t === selectedId);
      if (selectedId != null && !touches) return rgba(tc.edge, tc.faintA);
      if (l.kind === "wiki") {
        return rgba(tc.accent, touches ? tc.wikiHotA : tc.wikiA);
      }
      return rgba(tc.edge, touches ? tc.edgeHotA : tc.edgeA);
    },
    [selectedId, tc],
  );

  const linkWidth = useCallback(
    (l: FgLink) => {
      const touches =
        selectedId != null &&
        (sid(l.source) === selectedId || sid(l.target) === selectedId);
      if (l.kind === "wiki") return touches ? 1.6 : 1.1;
      return touches ? 1.2 : 0.7;
    },
    [selectedId],
  );

  const nodePointerAreaPaint = useCallback(
    (n: FgNode, color: string, ctx: CanvasRenderingContext2D) => {
      const r = radiusOf(n) + (isTouch ? 7 : 3);
      ctx.beginPath();
      ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [radiusOf, isTouch],
  );

  /* view -------------------------------------------------------------- */

  const backLink =
    "inline-flex items-center gap-2 text-blue-50 hover:text-foreground transition-colors active:opacity-70 text-sm";

  return (
    <>
      <SEOHead
        title="Knowledge Graph"
        description="An interactive map of the ideas in my Obsidian vault — browse how my notes on programming, tools, and computer science connect, and jump straight into any note."
        path="/graph"
      />
      <section className="section-padding pt-5 min-h-screen">
        <div className="w-full h-full md:px-10 max-w-7xl mx-auto">
          <div className="blog-intro">
            <TitleHeader
              title="Knowledge Graph"
              sub="My vault, connected"
            />
          </div>

          <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
            <Link to="/blog" className={backLink}>
              <ArrowLeft className="size-4" />
              Blog
            </Link>
            {data && (
              <p className="text-xs text-white-50/60" aria-live="polite">
                {data.counts.notes} notes · {data.counts.folders} folders ·{" "}
                {data.counts.wikiLinks} links
              </p>
            )}
          </div>

          {/* search */}
          <div className="relative mt-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white-50/40 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) {
                  e.preventDefault();
                  flyTo(matches[0]);
                }
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Jump to a note…"
              aria-label="Search notes and folders"
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-black-200 border border-black-50 text-white-50 placeholder:text-white-50/30 focus:outline-none focus:border-blue-50/40 transition-colors text-base"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white-50/40 hover:text-white-50 active:bg-black-100 transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
            {query && (
              <div className="absolute z-30 mt-2 w-full rounded-xl border border-black-50 bg-black-200 shadow-xl overflow-hidden">
                {matches.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-white-50/60">
                    No notes matching “{query}”.
                  </p>
                ) : (
                  matches.map((m) => (
                    <button
                      key={m.id}
                      data-id={m.id}
                      onClick={handleMatchClick}
                      className="w-full text-left px-4 py-2.5 text-sm text-blue-50 hover:bg-blue-500/10 active:bg-blue-500/15 transition-colors flex items-center gap-2.5"
                    >
                      {m.kind === "folder" ? (
                        <FolderOpen className="size-3.5 shrink-0" />
                      ) : (
                        <FileText className="size-3.5 shrink-0" />
                      )}
                      <span className="truncate">{m.title}</span>
                      <span className="ml-auto text-[11px] text-white-50/40 shrink-0">
                        {m.kind === "folder" ? "folder" : "note"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* top-level folder filter chips (BlogList style) */}
          {tops.length > 1 && (
            <div className="flex flex-nowrap md:flex-wrap gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {activeTop && (
                <button
                  onClick={() => setActiveTop(null)}
                  className="chip shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 text-xs rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                >
                  {activeTop}
                  <X className="size-3" />
                </button>
              )}
              {tops
                .filter((t) => t !== activeTop)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      tap(6);
                      setActiveTop(t);
                    }}
                    className="chip shrink-0 px-3.5 py-1.5 text-xs rounded-full bg-black-200 text-blue-50 hover:bg-black-50 hover:text-foreground"
                  >
                    {t}
                  </button>
                ))}
            </div>
          )}

          {/* graph */}
          <div
            ref={viewRef}
            className="relative mt-4 rounded-2xl card-border overflow-hidden bg-black-100 h-[68vh] min-h-[420px] graph-canvas"
          >
            <div className="absolute inset-0 graph-grid" aria-hidden="true" />

            <div
              ref={boxRef}
              className="absolute inset-0"
              aria-hidden="true"
            >
              {status === "ready" && size.w > 0 && (
                <Suspense fallback={null}>
                  <ForceGraph2D<GraphNodeData, GraphLinkData>
                    ref={fgRef}
                    width={size.w}
                    height={size.h}
                    graphData={filtered ?? { nodes: [], links: [] }}
                    nodeId="id"
                    nodeCanvasObject={paintNode}
                    nodeCanvasObjectMode={() => "replace" as const}
                    nodePointerAreaPaint={nodePointerAreaPaint}
                    linkColor={linkColor}
                    linkWidth={linkWidth}
                    nodeLabel={(n) => n.title}
                    showPointerCursor
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedId(null)}
                    onNodeDragEnd={(n) => {
                      n.fx = n.x;
                      n.fy = n.y;
                    }}
                    warmupTicks={40}
                    cooldownTicks={reduced ? 60 : 160}
                    d3AlphaDecay={reduced ? 0.15 : undefined}
                    d3VelocityDecay={0.3}
                  />
                </Suspense>
              )}
            </div>

            {/* controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
              <button
                className="graph-btn"
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => zoomBy(1.4)}
              >
                <Plus className="size-4" />
              </button>
              <button
                className="graph-btn"
                aria-label="Zoom out"
                title="Zoom out"
                onClick={() => zoomBy(1 / 1.4)}
              >
                <Minus className="size-4" />
              </button>
              <button
                className="graph-btn"
                aria-label="Fit graph to view"
                title="Fit to view"
                onClick={fitToView}
              >
                <Maximize2 className="size-4" />
              </button>
              <button
                className="graph-btn"
                aria-label="Reset graph layout"
                title="Reset layout"
                onClick={resetLayout}
              >
                <RotateCcw className="size-4" />
              </button>
            </div>

            {/* loading / error */}
            {status === "loading" && (
              <div className="absolute inset-0 z-10 flex-center">
                <div className="w-2/3 max-w-sm space-y-3">
                  <div className="h-4 w-1/2 bg-black-200 rounded animate-pulse" />
                  <div className="h-40 w-full bg-black-200 rounded-xl animate-pulse" />
                </div>
              </div>
            )}
            {status === "error" && (
              <div className="absolute inset-0 z-10 flex-center">
                <div className="text-center px-6">
                  <p className="text-red-400 mb-4 text-sm">
                    Failed to load the graph data.
                  </p>
                  <button
                    onClick={() => {
                      setStatus("loading");
                      setAttempt((a) => a + 1);
                    }}
                    className="px-5 py-3 rounded-lg border border-black-50 bg-black-200 hover:bg-black-100 text-white-50 active:scale-95 transition-transform text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* selected node card */}
            {selectedNode && (
              <div className="graph-card-in absolute bottom-3 inset-x-3 sm:inset-x-auto sm:right-3 sm:w-96 z-10 rounded-xl border border-black-50 bg-black-200/95 backdrop-blur-md p-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 size-9 rounded-lg flex-center shrink-0"
                    style={{
                      backgroundColor: `${topColor.get(topOf(selectedNode)) ?? "#94a3b8"}22`,
                      color: topColor.get(topOf(selectedNode)) ?? "#94a3b8",
                    }}
                  >
                    {selectedNode.kind === "folder" ? (
                      <FolderOpen className="size-4" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground break-words text-sm sm:text-base leading-snug">
                      {selectedNode.title}
                    </p>
                    <p className="text-xs text-white-50/60 break-all mt-0.5">
                      {selectedNode.kind === "folder"
                        ? selectedNode.path
                        : selectedNode.dir || "vault root"}
                    </p>
                    <p className="text-[11px] text-white-50/50 mt-1">
                      {degreeMap.get(selectedNode.id) ?? 0} connection
                      {(degreeMap.get(selectedNode.id) ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    aria-label="Clear selection"
                    onClick={() => setSelectedId(null)}
                    className="p-1.5 rounded-full text-white-50/50 hover:text-white-50 active:bg-black-100 transition-colors shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <button
                  onClick={() => openNode(selectedNode)}
                  className="mt-3 w-full py-2.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 active:scale-[0.98] transition-all"
                >
                  {selectedNode.kind === "folder"
                    ? "Open folder"
                    : "Open note"}
                  <ExternalLink className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* keyboard / screen-reader navigation (canvas is decorative to AT) */}
          {data && (
            <nav aria-label="Vault contents" className="sr-only">
              <h2>Every note and folder in the graph</h2>
              <ul>
                {data.nodes.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={
                        n.kind === "folder"
                          ? `/blog?path=${encodeURIComponent(n.path ?? "")}`
                          : `/blog/post/${n.id}`
                      }
                    >
                      {n.title}
                      {n.kind === "folder" ? " (folder)" : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <p className="flex items-center justify-center gap-2 text-xs text-white-50/50 mt-5 text-center">
            <Network className="size-3.5" />
            Built from my Obsidian vault · tap a node to explore, tap again to
            open
          </p>
        </div>
      </section>
    </>
  );
};

export default GraphPage;
