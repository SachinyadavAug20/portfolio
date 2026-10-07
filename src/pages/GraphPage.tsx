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
  MousePointer2,
  Network,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import SEOHead from "../seo/SEOHead";
import TitleHeader from "../components/TitleHeader";
import { useTheme } from "../lib/theme";
import { useNearViewport, isTouchDevice } from "../hooks/useNearViewport";
import { useReducedMotion } from "../hooks/useReducedMotion";
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
  /* last commit that touched this note (build-time, see generate-graph) */
  updated?: string;
  /* true when updated within FRESH_DAYS of the build — amber ring */
  fresh?: boolean;
  /* set by the deterministic radial layout before the engine sees the
     graph; ox/oy preserve the original spot for "Reset layout" */
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  ox?: number;
  oy?: number;
  vx?: number;
  vy?: number;
}

interface GraphLinkData {
  kind: "wiki" | "member" | "parent";
}

interface GraphData {
  generatedAt: string;
  counts: {
    notes: number;
    folders: number;
    links: number;
    wikiLinks: number;
    fresh: number;
  };
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

/* ── deterministic radial-tree layout ─────────────────────────────────────
   Hierarchy rings instead of force physics: every folder sits on the ring
   of its depth, its children fan out across the parent's angular wedge
   (guaranteed arc slice + subtree-weight share). Wiki links stay as chords
   across the circle. Positions are final from frame one — the simulation
   has nothing left to solve, so the graph is dense, structured and static. */

const RINGS = [125, 265, 410, 560, 680, 775];
const MIN_ARC = 20;

const ringOf = (depth: number) => RINGS[Math.min(depth, RINGS.length - 1)];

function applyRadialLayout(nodes: GraphNodeData[]): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  const roots: string[] = [];

  for (const n of nodes) {
    let pid = "";
    if (n.kind === "folder") {
      const segs = (n.path ?? "").split("/");
      segs.pop();
      if (segs.length) pid = "dir:" + segs.join("/");
    } else if (n.dir) {
      pid = "dir:" + n.dir;
    }
    if (pid && pid !== n.id && byId.has(pid)) {
      const list = children.get(pid);
      if (list) list.push(n.id);
      else children.set(pid, [n.id]);
    } else {
      roots.push(n.id);
    }
  }

  /* every node must be reachable from a root (cycle/stray safety) */
  const reachable = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const id = stack.pop();
    if (id == null || reachable.has(id)) continue;
    reachable.add(id);
    for (const k of children.get(id) ?? []) stack.push(k);
  }
  for (const n of nodes) if (!reachable.has(n.id)) roots.push(n.id);

  /* subtree weight = number of leaf notes below (min 1) */
  const weight = new Map<string, number>();
  const weigh = (id: string, seen: Set<string>): number => {
    const cached = weight.get(id);
    if (cached != null) return cached;
    if (seen.has(id)) return 1;
    seen.add(id);
    const kids = children.get(id);
    if (!kids?.length) {
      weight.set(id, 1);
      return 1;
    }
    let sum = 0;
    for (const k of kids) sum += weigh(k, seen);
    const w = Math.max(sum, 1);
    weight.set(id, w);
    return w;
  };
  for (const n of nodes) weigh(n.id, new Set());

  const place = (
    id: string,
    depth: number,
    a0: number,
    a1: number,
    seen: Set<string>,
  ): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const node = byId.get(id);
    if (!node) return;

    const mid = (a0 + a1) / 2;
    const r = ringOf(depth);
    const x = r * Math.cos(mid);
    const y = r * Math.sin(mid);
    node.x = x;
    node.y = y;
    node.fx = x;
    node.fy = y;
    node.ox = x;
    node.oy = y;
    node.vx = 0;
    node.vy = 0;

    const kids = children.get(id);
    if (!kids?.length) return;
    const span = a1 - a0;
    const count = kids.length;
    /* guaranteed arc per child (spacing floor, capped by the wedge) … */
    const minSlice = Math.min(
      span / count,
      Math.max(span / (2 * count), MIN_ARC / ringOf(depth + 1)),
    );
    const remaining = span - minSlice * count;
    let totalW = 0;
    const ws = kids.map((k) => {
      const w = weight.get(k) ?? 1;
      totalW += w;
      return w;
    });
    let a = a0;
    for (let i = 0; i < count; i++) {
      const sl = minSlice + (totalW > 0 ? (remaining * ws[i]) / totalW : 0);
      place(kids[i], depth + 1, a, a + sl, seen);
      a += sl;
    }
  };

  const seen = new Set<string>();
  if (roots.length) {
    const span = Math.PI * 2;
    const count = roots.length;
    const minSlice = Math.min(
      span / count,
      Math.max(span / (2 * count), MIN_ARC / ringOf(0)),
    );
    const remaining = span - minSlice * count;
    let totalW = 0;
    const ws = roots.map((id) => {
      const w = weight.get(id) ?? 1;
      totalW += w;
      return w;
    });
    let a = 0;
    for (let i = 0; i < count; i++) {
      const sl = minSlice + (totalW > 0 ? (remaining * ws[i]) / totalW : 0);
      place(roots[i], 0, a, a + sl, seen);
      a += sl;
    }
  }
}

/* gap relaxation — the radial floors can still leave dense fans touching;
   nudge overlapping nodes apart along their connecting axis (Jacobi-style,
   one correction pass per iteration) and re-pin the final spot */
function relaxNodeGaps(
  nodes: GraphNodeData[],
  links: LinkObject<GraphNodeData, GraphLinkData>[],
  gap = 14,
  iterations = 40,
): void {
  const deg = new Map<string, number>();
  for (const l of links) {
    const s = sid(l.source);
    const t = sid(l.target);
    if (s) deg.set(s, (deg.get(s) ?? 0) + 1);
    if (t) deg.set(t, (deg.get(t) ?? 0) + 1);
  }
  const arr = nodes.filter(
    (n) => typeof n.x === "number" && typeof n.y === "number",
  ) as (GraphNodeData & { x: number; y: number })[];
  if (arr.length < 2) return;
  const rad = arr.map((n) => {
    const base = n.kind === "folder" ? 4 : 3.2;
    return base + Math.sqrt(Math.min(deg.get(n.id) ?? 0, 40)) * 0.92;
  });
  const px = new Float64Array(arr.length);
  const py = new Float64Array(arr.length);

  for (let it = 0; it < iterations; it++) {
    px.fill(0);
    py.fill(0);
    let overlaps = 0;
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j];
        const minD = rad[i] + rad[j] + gap;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minD * minD) continue;
        overlaps++;
        let ux: number;
        let uy: number;
        let dist = Math.sqrt(d2);
        if (dist < 0.001) {
          /* coincident — deterministic golden-angle nudge */
          const ang = i * 2.399963229728653;
          ux = Math.cos(ang);
          uy = Math.sin(ang);
          dist = 0;
        } else {
          ux = dx / dist;
          uy = dy / dist;
        }
        const push = (minD - dist) / 2;
        px[i] -= ux * push;
        py[i] -= uy * push;
        px[j] += ux * push;
        py[j] += uy * push;
      }
    }
    if (!overlaps) break;
    for (let i = 0; i < arr.length; i++) {
      arr[i].x += px[i];
      arr[i].y += py[i];
    }
  }
  for (const n of arr) {
    n.fx = n.x;
    n.fy = n.y;
    n.ox = n.x;
    n.oy = n.y;
    n.vx = 0;
    n.vy = 0;
  }
}

/* ── page ─────────────────────────────────────────────────────────────── */

const GraphPage = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const reduced = useReducedMotion();
  const isTouch = useMemo(() => isTouchDevice(), []);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    cachedGraph ? "ready" : "loading",
  );
  const [data, setData] = useState<GraphData | null>(cachedGraph);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeTop, setActiveTop] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });

  const boxRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<
    ForceGraphMethods<FgNode, FgLink> | undefined
  >(undefined);
  const interactedRef = useRef(false);
  /* lazy+Suspense: ForceGraph2D mounts a commit AFTER status flips to ready,
     so ref-less effects miss fgRef — first engine tick flips fgReady so they
     re-run once the instance actually exists */
  const [fgReady, setFgReady] = useState(false);
  const { ref: viewRef, visible } = useNearViewport<HTMLDivElement>("80px");

  /* pointer-following hover tooltip (desktop only) — position is written
     straight to the DOM on pointermove so hovering never re-renders */
  const tipRef = useRef<HTMLDivElement>(null);
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isTouch) return;
      const tip = tipRef.current;
      if (!tip) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      const flipX = x + 16 + w > rect.width;
      const flipY = y + 16 + h > rect.height;
      tip.style.transform = `translate(${Math.round(
        flipX ? x - 16 - w : x + 16,
      )}px, ${Math.round(flipY ? y - 16 - h : y + 16)}px)`;
    },
    [isTouch],
  );

  /* first-visit onboarding hint: dismissed by timeout or the first
     interaction, remembered in localStorage so it never nags again */
  const HINT_KEY = "graph-hint-dismissed";
  const [hintState, setHintState] = useState<"show" | "hide">(() => {
    try {
      return localStorage.getItem(HINT_KEY) === "1" ? "hide" : "show";
    } catch {
      return "show";
    }
  });
  const dismissHint = useCallback(() => {
    setHintState((s) => (s === "show" ? "hide" : s));
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* private mode — hint just reappears next visit */
    }
  }, []);
  useEffect(() => {
    if (hintState !== "show") return;
    const t = window.setTimeout(dismissHint, 7000);
    return () => window.clearTimeout(t);
  }, [hintState, dismissHint]);

  /* filter chips FLIP between selections (disabled under reduced motion) */
  const [chipsRef, chipsEnable] = useAutoAnimate<HTMLDivElement>();
  useEffect(() => {
    chipsEnable(!reduced);
  }, [reduced, chipsEnable]);

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
        applyRadialLayout(json.nodes);
        relaxNodeGaps(json.nodes, json.links);
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
      node: light ? "#3d444e" : "#e3e9f2",
      edge: light ? "#5d6879" : "#8b96ab",
      edgeA: light ? 0.52 : 0.46,
      edgeHotA: light ? 0.65 : 0.7,
      faintA: 0.07,
      accent: v("--tab-accent", "#38bdf8"),
      wikiA: light ? 0.7 : 0.62,
      wikiHotA: 1,
      dimA: light ? 0.12 : 0.14,
      label: v("--flip-blue-50", "#839cb5"),
      labelStrong: v("--flip-white-50", "#d9ecff"),
      halo: light ? "rgba(255,255,255,0.9)" : "rgba(8,9,12,0.9)",
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

  /* hovered node (for the pointer-following tooltip) */
  const hoverNode = useMemo(
    () =>
      hoverId
        ? filtered?.nodes.find((n) => n.id === hoverId) ?? null
        : null,
    [hoverId, filtered],
  );

  /* hover neighbourhood (Obsidian-style hover focus) */
  const hoverSet = useMemo(() => {
    if (!hoverId || !filtered) return null;
    const ids = new Set<string>([hoverId]);
    for (const l of filtered.links) {
      const s = sid(l.source);
      const t = sid(l.target);
      if (s === hoverId) ids.add(t);
      else if (t === hoverId) ids.add(s);
    }
    return ids;
  }, [hoverId, filtered]);

  /* union of selection + hover focus; hover wins the "hot" highlight */
  const focus = useMemo(() => {
    if (!selection && !hoverSet) return null;
    const ids = new Set<string>();
    selection?.ids.forEach((id) => ids.add(id));
    hoverSet?.forEach((id) => ids.add(id));
    return { ids, hot: hoverId ?? selectedId };
  }, [selection, hoverSet, hoverId, selectedId]);

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
      const base = n.kind === "folder" ? 4 : 3.2;
      return base + Math.sqrt(Math.min(deg, 40)) * 0.92;
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

  const handleNodeClick = useCallback((n: FgNode) => {
    tap(8);
    setSelectedId(n.id ?? null);
  }, []);

  const flyTo = useCallback(
    (n: GraphNodeData) => {
      setSelectedId(n.id);
      setQuery("");
      tap(8);
      interactedRef.current = true;
      const fg = fgRef.current;
      if (!fg || n.x == null || n.y == null) return;
      const dur = reduced ? 0 : 700;
      fg.centerAt(n.x, n.y, dur);
      fg.zoom(Math.max(fg.zoom(), 2.2), dur);
    },
    [reduced],
  );

  /* double-click (mouse) / double-tap (touch) zooms into the node under the
     pointer, or into the point itself when on the background */
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });
  const touchZoomAtRef = useRef(0);

  const zoomInto = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const fg = fgRef.current;
      if (!fg) return;
      const n = hoverId
        ? filtered?.nodes.find((x) => x.id === hoverId)
        : null;
      const target =
        n && n.x != null && n.y != null
          ? { x: n.x, y: n.y }
          : fg.screen2GraphCoords(clientX - rect.left, clientY - rect.top);
      const dur = reduced ? 0 : 320;
      interactedRef.current = true;
      fg.centerAt(target.x, target.y, dur);
      fg.zoom(Math.min(fg.zoom() * (n ? 2 : 1.6), 6), dur);
      tap(6);
    },
    [hoverId, filtered, reduced],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouch) return; /* touch devices zoom via double-tap instead */
      if (performance.now() - touchZoomAtRef.current < 500) return;
      zoomInto(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
    },
    [isTouch, zoomInto],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "touch") return;
      const now = performance.now();
      const prev = lastTapRef.current;
      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
      if (
        now - prev.t < 350 &&
        Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40
      ) {
        touchZoomAtRef.current = now;
        zoomInto(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
      }
    },
    [zoomInto],
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
    interactedRef.current = true;
    const next = Math.min(Math.max(fg.zoom() * factor, 0.05), 8);
    fg.zoom(next, reduced ? 0 : 250);
  }, [reduced]);

  const fitToView = useCallback(() => {
    interactedRef.current = true;
    fgRef.current?.zoomToFit(reduced ? 0 : 350, 56);
  }, [reduced]);

  const resetLayout = useCallback(() => {
    /* restore the deterministic positions (dragged nodes snap back) and
       re-frame — the zoomToFit animation guarantees a redraw */
    data?.nodes.forEach((n) => {
      n.x = n.ox;
      n.y = n.oy;
      n.fx = n.ox;
      n.fy = n.oy;
      n.vx = 0;
      n.vy = 0;
    });
    interactedRef.current = false;
    fgRef.current?.zoomToFit(reduced ? 0 : 350, 56);
    tap(8);
  }, [data, reduced]);

  /* first engine tick = the lazy graph instance actually mounted */
  const handleEngineTick = useCallback(() => {
    setFgReady(true);
  }, []);

  /* frame the whole graph once the instance exists and on filter changes;
     positions are final (radial layout), so one fit is enough */
  useEffect(() => {
    interactedRef.current = false;
    if (status !== "ready" || !size.w) return;
    const t = window.setTimeout(() => {
      if (!interactedRef.current) {
        fgRef.current?.zoomToFit(reduced ? 0 : 600, 56);
      }
    }, 160);
    return () => window.clearTimeout(t);
  }, [status, size.w, reduced, activeTop, fgReady]);

  /* rendering --------------------------------------------------------- */

  /* label decluttering: the graph is static, so once per zoom bucket we
     pre-decide which labels fit without overlapping — highest-degree nodes
     win. Decisions live in a ref; paint just consults the map. */
  type LabelBox = { x: number; y: number; w: number; h: number };
  const nodesRef = useRef<GraphNodeData[] | null>(null);
  const measureRef = useRef<CanvasRenderingContext2D | null>(null);
  const labelCacheRef = useRef<{
    scaleQ: number;
    nodes: GraphNodeData[] | null;
    focus: typeof focus;
    boxes: Map<string, LabelBox | null>;
  }>({ scaleQ: -1, nodes: null, focus: null, boxes: new Map() });

  useEffect(() => {
    nodesRef.current = filtered?.nodes ?? null;
  }, [filtered]);

  const getLabelBoxes = useCallback(
    (globalScale: number): Map<string, LabelBox | null> => {
      const scaleQ = Math.round(globalScale * 20) / 20; /* 5% buckets */
      const nodes = nodesRef.current;
      const cache = labelCacheRef.current;
      if (cache.scaleQ === scaleQ && cache.nodes === nodes && cache.focus === focus)
        return cache.boxes;

      const boxes = new Map<string, LabelBox | null>();
      if (!nodes || scaleQ <= 0.6) {
        labelCacheRef.current = { scaleQ, nodes, focus, boxes };
        return boxes;
      }
      if (!measureRef.current)
        measureRef.current = document
          .createElement("canvas")
          .getContext("2d");
      const m = measureRef.current;
      if (!m) {
        labelCacheRef.current = { scaleQ, nodes, focus, boxes };
        return boxes;
      }
      const pad = 3 / scaleQ;
      const baseShow = (n: GraphNodeData): boolean => {
        const deg = degreeMap.get(n.id) ?? 0;
        return (
          (n.kind === "folder" && scaleQ > 0.75) ||
          (deg >= 25 && scaleQ > 0.65) ||
          scaleQ > 1.15
        );
      };
      const accepted: LabelBox[] = [];
      const ordered = nodes
        .filter(baseShow)
        .sort(
          (a, b) =>
            (degreeMap.get(b.id) ?? 0) - (degreeMap.get(a.id) ?? 0),
        );
      for (const n of ordered) {
        const isFolder = n.kind === "folder";
        const fontSize = Math.max(11 / scaleQ, 3);
        const text = truncate(n.title, isFolder ? 24 : 20);
        m.font = `${isFolder ? 600 : 500} ${fontSize}px "Geist Variable", Inter, system-ui, sans-serif`;
        const w = m.measureText(text).width;
        const r = radiusOf(n);
        const box: LabelBox = {
          x: (n.x ?? 0) - w / 2 - pad,
          y: (n.y ?? 0) + r + 3 / scaleQ - pad,
          w: w + pad * 2,
          h: fontSize * 1.35 + pad * 2,
        };
        const hits = accepted.some(
          (o) =>
            o.x < box.x + box.w &&
            box.x < o.x + o.w &&
            o.y < box.y + box.h &&
            box.y < o.y + o.h,
        );
        if (hits) {
          boxes.set(n.id, null);
          continue;
        }
        accepted.push(box);
        boxes.set(n.id, box);
      }
      labelCacheRef.current = { scaleQ, nodes, focus, boxes };
      return boxes;
    },
    [degreeMap, radiusOf, focus],
  );

  const paintNode = useCallback(
    (n: FgNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const id = n.id ?? "";
      const isSel = selectedId === id;
      const isHot = focus?.hot === id && !isSel;
      const dim = focus ? !focus.ids.has(id) : false;
      const r = radiusOf(n);
      const x = n.x ?? 0;
      const y = n.y ?? 0;

      ctx.globalAlpha = dim ? tc.dimA : 1;

      if (n.kind === "folder") {
        ctx.beginPath();
        ctx.roundRect(x - r, y - r, r * 2, r * 2, r * 0.45);
        ctx.fillStyle = tc.node;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = tc.node;
        ctx.fill();
        /* recently-updated notes glow amber — filled dot, ring, halo
           (inside the blue selection ring) */
        if (n.fresh) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = "#f59e0b";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, r + 2, 0, Math.PI * 2);
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 1.5 / globalScale;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(245,158,11,0.35)";
          ctx.lineWidth = 2.5 / globalScale;
          ctx.stroke();
        }
      }

      if (isSel || isHot) {
        ctx.beginPath();
        ctx.arc(x, y, r + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = tc.accent;
        ctx.lineWidth = (isSel ? 1.75 : 1.2) / globalScale;
        ctx.stroke();
      }

      /* selected/hovered always labelled; everything else follows the
         pre-computed decluttered decisions for this zoom bucket */
      const showLabel =
        !dim &&
        (isSel || isHot || getLabelBoxes(globalScale).get(id) != null);

      if (showLabel) {
        const fontSize = Math.max(11 / globalScale, 3);
        const text = truncate(n.title, n.kind === "folder" ? 24 : 20);
        const ty = y + r + 3 / globalScale;
        ctx.font = `${n.kind === "folder" ? 600 : 500} ${fontSize}px "Geist Variable", Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3 / globalScale;
        ctx.strokeStyle = tc.halo;
        ctx.strokeText(text, x, ty);
        ctx.fillStyle = n.kind === "folder" ? tc.labelStrong : tc.label;
        ctx.fillText(text, x, ty);
      }

      ctx.globalAlpha = 1;
    },
    [selectedId, focus, radiusOf, tc, getLabelBoxes],
  );

  const linkColor = useCallback(
    (l: FgLink) => {
      const s = sid(l.source);
      const t = sid(l.target);
      const touches = focus != null && (s === focus.hot || t === focus.hot);
      if (focus != null && !touches) return rgba(tc.edge, tc.faintA);
      if (l.kind === "wiki") {
        return rgba(tc.accent, touches ? tc.wikiHotA : tc.wikiA);
      }
      return rgba(tc.edge, touches ? tc.edgeHotA : tc.edgeA);
    },
    [focus, tc],
  );

  const linkWidth = useCallback(
    (l: FgLink) => {
      const touches =
        focus != null &&
        (sid(l.source) === focus.hot || sid(l.target) === focus.hot);
      if (l.kind === "wiki") return touches ? 1.6 : 1;
      return touches ? 1.2 : 0.7;
    },
    [focus],
  );

  const nodePointerAreaPaint = useCallback(
    (n: FgNode, color: string, ctx: CanvasRenderingContext2D) => {
      /* hit target in screen pixels — graph units alone are ~1px at fit zoom */
      const k = Math.max(fgRef.current?.zoom() ?? 1, 0.01);
      const r = Math.max(radiusOf(n), (isTouch ? 14 : 9) / k);
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
                {data.counts.fresh > 0 && (
                  <span className="ml-3 inline-flex items-center gap-1.5 text-white-50/70">
                    <span
                      className="inline-block size-2.5 rounded-full border-[1.5px] border-amber-500"
                      aria-hidden="true"
                    />
                    {data.counts.fresh} updated recently
                  </span>
                )}
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
              className="w-full pl-11 pr-10 py-3 rounded-xl bg-black-200 border border-black-50 text-white-50 placeholder:text-white-50/30 focus:border-blue-500/50 transition-colors text-base"
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
              <div className="menu-anim absolute z-30 mt-2 w-full rounded-xl border border-black-50 bg-black-200 shadow-xl overflow-hidden">
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
            <div
              ref={chipsRef}
              className="flex flex-nowrap md:flex-wrap gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar"
            >
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
            onWheel={() => {
              interactedRef.current = true;
              dismissHint();
            }}
            onPointerDown={() => {
              interactedRef.current = true;
              dismissHint();
            }}
            onPointerMove={handlePointerMove}
            onDoubleClick={handleDoubleClick}
            onPointerUp={handlePointerUp}
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
                    showPointerCursor
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={() => setSelectedId(null)}
                    onNodeHover={(n) => setHoverId(n?.id ?? null)}
                    onNodeDragEnd={(n) => {
                      n.fx = n.x;
                      n.fy = n.y;
                    }}
                    warmupTicks={0}
                    cooldownTicks={30}
                    cooldownTime={1500}
                    onEngineTick={handleEngineTick}
                  />
                </Suspense>
              )}
            </div>

            {/* controls */}
            <div
              className="absolute top-3 right-3 z-10 flex flex-col gap-2"
              onDoubleClick={(e) => e.stopPropagation()}
            >
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

            {/* pointer-following hover tooltip */}
            {!isTouch && (
              <div
                ref={tipRef}
                aria-hidden="true"
                className={`graph-tip absolute left-0 top-0 z-20 max-w-[240px] rounded-lg border border-black-50 bg-black-200/95 backdrop-blur-md px-3 py-2 shadow-xl${
                  hoverNode ? " graph-tip-on" : ""
                }`}
              >
                {hoverNode && (
                  <>
                    <p className="font-medium text-foreground text-xs leading-snug break-words">
                      {hoverNode.title}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white-50/60">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            topColor.get(topOf(hoverNode)) ?? "#94a3b8",
                        }}
                      />
                      {hoverNode.kind}
                      <span className="text-white-50/30">·</span>
                      {degreeMap.get(hoverNode.id) ?? 0} connection
                      {(degreeMap.get(hoverNode.id) ?? 0) === 1 ? "" : "s"}
                    </p>
                    {hoverNode.updated && (
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white-50/55">
                        <span
                          className={`inline-block size-2 rounded-full border-[1.5px] shrink-0 ${
                            hoverNode.fresh
                              ? "border-amber-500"
                              : "border-white-50/30"
                          }`}
                          aria-hidden="true"
                        />
                        updated{" "}
                        {new Date(hoverNode.updated).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* first-visit onboarding hint (top edge: the graph's bottom
               often sits below the fold, so bottom placement would hide it) */}
            {!selectedNode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[94%] pointer-events-none sm:left-auto sm:right-24 sm:translate-x-0 sm:max-w-[60%]">
                <div
                  aria-hidden="true"
                  className={`graph-hint pointer-events-auto flex items-center gap-2 rounded-full border border-black-50 bg-black-200/95 backdrop-blur-md px-4 py-2 text-xs text-blue-50 shadow-xl text-center${
                    hintState === "hide" ? " graph-hint-off" : ""
                  }`}
                >
                  <MousePointer2 className="size-3.5 shrink-0 text-blue-300" />
                  {isTouch
                    ? "Drag to pan · pinch to zoom · double-tap to zoom"
                    : "Drag to pan · scroll to zoom · double-click to zoom in"}
                </div>
              </div>
            )}

            {/* loading / error */}
            {status === "loading" && (
              <div className="absolute inset-0 z-10 flex-center">
                <div className="w-2/3 max-w-sm space-y-3">
                  <div className="skeleton h-4 w-1/2 bg-black-200 rounded" />
                  <div className="skeleton h-40 w-full bg-black-200 rounded-xl" />
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
              <div
                className="graph-card-in absolute bottom-3 inset-x-3 sm:inset-x-auto sm:right-3 sm:w-96 z-10 rounded-xl border border-black-50 bg-black-200/95 backdrop-blur-md p-4 shadow-xl"
                onDoubleClick={(e) => e.stopPropagation()}
              >
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
                    {selectedNode.updated && (
                      <p className="text-[11px] text-white-50/55 mt-1 inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block size-2 rounded-full border-[1.5px] shrink-0 ${
                            selectedNode.fresh
                              ? "border-amber-500"
                              : "border-white-50/30"
                          }`}
                          aria-hidden="true"
                        />
                        updated{" "}
                        {new Date(selectedNode.updated).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </p>
                    )}
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
            Built from my Obsidian vault · tap a node for details ·
            double-tap to zoom
          </p>
        </div>
      </section>
    </>
  );
};

export default GraphPage;
