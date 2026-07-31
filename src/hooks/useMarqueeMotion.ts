import { useLayoutEffect } from "react";
import gsap from "gsap";

type RowRef = React.RefObject<HTMLDivElement | null>;

type RowState = {
  el: HTMLDivElement;
  amt: number;
  half: number;
  vel: number;
  dragging: boolean;
  hovered: boolean;
  didMove: number;
  lastX: number;
  lastT: number;
  base: number;
};

const BOOST_DECAY = 0.9;
const FRICTION = 0.92;
const MIN_VELOCITY = 0.5;
const DRAG_THRESHOLD = 6;

export const useMarqueeMotion = (rowRefs: RowRef[], baseSpeed: number) => {
  useLayoutEffect(() => {
    const rows: RowState[] = [];
    for (let i = 0; i < rowRefs.length; i++) {
      const el = rowRefs[i]?.current;
      if (!el) return;
      rows.push({
        el,
        amt: 0,
        half: 0,
        vel: 0,
        dragging: false,
        hovered: false,
        didMove: 0,
        lastX: 0,
        lastT: 0,
        base: i % 2 === 0 ? 1 : -1,
      });
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const rowByEl = (el: HTMLDivElement) => rows.find((row) => row.el === el);

    const measure = () => {
      for (const row of rows) {
        row.half = row.el.scrollWidth / 2;
        if (row.half > 0) {
          row.amt = ((row.amt % row.half) + row.half) % row.half;
        }
      }
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    let boost = 0;
    let scrollDir = 1;
    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const dt = (now - lastT) / 1000;
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      lastT = now;
      if (dt <= 0) return;
      const v = dy / dt;
      if (Math.abs(v) > 120) {
        boost = Math.min(3, Math.abs(v) * 0.0012);
        if (Math.abs(v) > 250) scrollDir = v > 0 ? 1 : -1;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const render = (_: number, deltaTime: number) => {
      const dt = Math.min(deltaTime / 1000, 0.1);
      for (const row of rows) {
        if (!row.dragging && !row.hovered) {
          if (Math.abs(row.vel) > MIN_VELOCITY) {
            row.amt += row.vel * dt;
            row.vel *= Math.pow(FRICTION, dt * 60);
          } else {
            row.vel = 0;
            row.amt += baseSpeed * row.base * scrollDir * (1 + boost) * dt;
          }
        }
        if (row.half > 0) {
          row.amt = ((row.amt % row.half) + row.half) % row.half;
          row.el.style.transform = `translate3d(${-row.amt}px,0,0)`;
        }
      }
      boost *= Math.pow(BOOST_DECAY, dt * 60);
    };
    gsap.ticker.add(render);

    const onPointerDown = (e: PointerEvent) => {
      const row = rowByEl(e.currentTarget as HTMLDivElement);
      if (!row) return;
      row.dragging = true;
      row.vel = 0;
      row.didMove = 0;
      row.lastX = e.clientX;
      row.lastT = e.timeStamp;
      row.el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const row = rowByEl(e.currentTarget as HTMLDivElement);
      if (!row || !row.dragging) return;
      const dx = e.clientX - row.lastX;
      const dt = Math.max((e.timeStamp - row.lastT) / 1000, 0.001);
      row.didMove += Math.abs(dx);
      row.amt -= dx;
      row.vel = -dx / dt;
      row.lastX = e.clientX;
      row.lastT = e.timeStamp;
    };
    const onPointerUp = (e: PointerEvent) => {
      const row = rowByEl(e.currentTarget as HTMLDivElement);
      if (!row) return;
      row.dragging = false;
    };
    const onClick = (e: MouseEvent) => {
      const row = rowByEl(e.currentTarget as HTMLDivElement);
      if (row && row.didMove > DRAG_THRESHOLD) {
        e.preventDefault();
      }
    };
    const onEnter = (e: MouseEvent) => {
      const row = rowByEl(e.currentTarget as HTMLDivElement);
      if (row) row.hovered = true;
    };
    const onLeave = (e: MouseEvent) => {
      const row = rowByEl(e.currentTarget as HTMLDivElement);
      if (row) row.hovered = false;
    };

    for (const row of rows) {
      row.el.addEventListener("pointerdown", onPointerDown);
      row.el.addEventListener("pointermove", onPointerMove);
      row.el.addEventListener("pointerup", onPointerUp);
      row.el.addEventListener("pointercancel", onPointerUp);
      row.el.addEventListener("click", onClick);
      row.el.addEventListener("mouseenter", onEnter);
      row.el.addEventListener("mouseleave", onLeave);
    }

    return () => {
      gsap.ticker.remove(render);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      for (const row of rows) {
        row.el.removeEventListener("pointerdown", onPointerDown);
        row.el.removeEventListener("pointermove", onPointerMove);
        row.el.removeEventListener("pointerup", onPointerUp);
        row.el.removeEventListener("pointercancel", onPointerUp);
        row.el.removeEventListener("click", onClick);
        row.el.removeEventListener("mouseenter", onEnter);
        row.el.removeEventListener("mouseleave", onLeave);
      }
    };
  }, [rowRefs, baseSpeed]);
};
