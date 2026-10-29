import { useEffect, useMemo, useState } from "react";

type Vec = { x: number; y: number };

/* Non-Euclidean honeycomb background: a hexagonal lattice whose vertices
   drift through two smooth random wave fields and whose edges bow along
   their normals — mathematically no straight line can occur. Rendered as a
   data-URL SVG painted on <body> itself, the true bottom layer of the page,
   so no overlay can ever hide it. Fields are randomised every generation,
   so each page (and resize) gets a unique pattern. */
const WaveHexGrid = () => {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark"),
  );

  /* full document height, remeasured on resize and on any content change
     (route swaps change it). Debounced — the page hosts a DOM-mutating cat
     and a doc that can be 10k+ px tall, so regeneration stays rare. */
  useEffect(() => {
    let timer = 0;
    let lastW = 0;
    let lastH = 0;
    const measure = () => {
      timer = 0;
      const w = document.documentElement.clientWidth;
      const h = document.documentElement.scrollHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      setDims({ w, h });
    };
    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(measure, 250);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    window.addEventListener("resize", schedule);
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    schedule();
    return () => {
      if (timer) window.clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      mo.disconnect();
    };
  }, []);

  /* follow dark-mode toggles so the stroke contrast flips with the theme */
  useEffect(() => {
    const mo = new MutationObserver(
      () => setDark(document.documentElement.classList.contains("dark")),
    );
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const backgroundImage = useMemo(() => {
    const { w, h } = dims;
    if (!w || !h) return "";
    const r = 44; // hex circumradius
    const H = Math.min(h, 16000); /* cap so a monster page can't spawn megabytes */
    const A = r * 0.35; // vertex drift amplitude
    const C = r * 0.26; // edge-bow amplitude
    /* fresh randomness every generation — never the same pattern twice */
    const p = [...Array(6)].map(() => Math.random() * Math.PI * 2);
    const fx = 2.5 + Math.random() * 2.5;
    const fy = 2.5 + Math.random() * 2.5;
    const bowF = 3 + Math.random() * 3;

    const wobX = (v: Vec) =>
      A * Math.sin((v.x / w) * Math.PI * fx + p[0]) *
      Math.cos((v.y / H) * Math.PI * fy + p[1]);
    const wobY = (v: Vec) =>
      A * Math.cos((v.x / w) * Math.PI * fx + p[2]) *
      Math.sin((v.y / H) * Math.PI * fy + p[3]);
    const bow = (v: Vec) => C * Math.sin(v.x * (bowF / w) + p[4]) * Math.cos(v.y * (bowF / w) * 1.7 + p[5]);

    const seen = new Set<string>();
    let d = "";
    const hs = Math.sqrt(3) * r;
    const vs = 1.5 * r;
    const cols = Math.ceil((w + 3 * r) / hs) + 2;
    const rows = Math.ceil((H + 3 * r) / vs) + 2;
    const key = (a: Vec, b: Vec) => {
      const s = [[a.x, a.y], [b.x, b.y]].sort(
        (u, v) => u[0] - v[0] || u[1] - v[1],
      );
      return `${Math.round(s[0][0])},${Math.round(s[0][1])}|${Math.round(s[1][0])},${Math.round(s[1][1])}`;
    };

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const cx = col * hs + (row % 2 !== 0 ? hs / 2 : 0) - r;
        const cy = row * vs - r;
        const verts: Vec[] = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          verts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        for (let i = 0; i < 6; i++) {
          const a = verts[i];
          const b = verts[(i + 1) % 6];
          const id = key(a, b);
          if (seen.has(id)) continue;
          seen.add(id);
          const ax = a.x + wobX(a);
          const ay = a.y + wobY(a);
          const bx = b.x + wobX(b);
          const by = b.y + wobY(b);
          const lift = bow({ x: (ax + bx) / 2, y: (ay + by) / 2 });
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const qx = (ax + bx) / 2 - ((by - ay) / len) * lift;
          const qy = (ay + by) / 2 + ((bx - ax) / len) * lift;
          d += `M${ax.toFixed(1)} ${ay.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
        }
      }
    }

    /* dark ink needs lighter strokes for the same perceived confidence */
    const stroke = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}"><path d="${d}" fill="none" stroke="${stroke}" stroke-width="1"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [dims, dark]);

  useEffect(() => {
    if (!backgroundImage) return;
    const { w, h } = dims;
    document.body.style.backgroundImage = backgroundImage;
    document.body.style.backgroundSize = `${w}px ${h}px`;
    document.body.style.backgroundRepeat = "no-repeat";
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundRepeat = "";
    };
  }, [backgroundImage, dims]);

  return null;
};

export default WaveHexGrid;
