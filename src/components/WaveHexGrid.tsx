import { useEffect, useMemo, useState } from "react";

type Vec = { x: number; y: number };

/* Non-Euclidean honeycomb background: a hexagonal lattice whose vertices
   drift through two smooth random wave fields and whose edges bow along
   their normals — mathematically no straight line can occur. Fields are
   randomised on every load, so the pattern is never the same twice. */
const WaveHexGrid = () => {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const measure = () =>
      setSize((s) =>
        s.w === window.innerWidth && s.h === window.innerHeight
          ? s
          : { w: window.innerWidth, h: window.innerHeight },
      );
    measure();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* wave-field parameters — fresh randomness on every page load */
  const field = useMemo(
    () => ({
      p: [...Array(6)].map(() => Math.random() * Math.PI * 2),
      fx: 2.5 + Math.random() * 2.5,
      fy: 2.5 + Math.random() * 2.5,
      f: 3 + Math.random() * 3,
    }),
    [],
  );

  const dAttr = useMemo(() => {
    const { w, h } = size;
    if (!w || !h) return "";
    const r = 44; // hex circumradius
    const A = r * 0.35; // vertex drift amplitude
    const C = r * 0.26; // edge-bow amplitude
    const [p0, p1, p2, p3, p4, p5] = field.p;
    const k = field.f / w;

    const wobX = (v: Vec) =>
      A * Math.sin((v.x / w) * Math.PI * field.fx + p0) *
      Math.cos((v.y / h) * Math.PI * field.fy + p1);
    const wobY = (v: Vec) =>
      A * Math.cos((v.x / w) * Math.PI * field.fx + p2) *
      Math.sin((v.y / h) * Math.PI * field.fy + p3);
    const bow = (v: Vec) => C * Math.sin(v.x * k + p4) * Math.cos(v.y * k * 1.7 + p5);

    const seen = new Set<string>();
    let d = "";
    const hs = Math.sqrt(3) * r;
    const vs = 1.5 * r;
    const cols = Math.ceil(((w + 3 * r) / hs) / 1 + 2);
    const rows = Math.ceil((h + 3 * r) / vs) + 2;
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
    return d;
  }, [size, field]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-[-1]">
      <svg width="100%" height="100%" className="stroke-black/[0.06] dark:stroke-white/[0.08]">
        <path d={dAttr} fill="none" strokeWidth={1} />
      </svg>
    </div>
  );
};

export default WaveHexGrid;
