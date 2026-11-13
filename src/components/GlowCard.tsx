import { useRef, type JSX } from "react";
import type { expCardProps } from "../../constants";

const GlowCard = ({
  card: _card,
  children,
  index: _index,
}: {
  card?: expCardProps;
  children: JSX.Element;
  index: number;
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = cardRef.current;
    if (!el) return;
    rectRef.current = el.getBoundingClientRect();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = cardRef.current;
    const rect = rectRef.current;
    if (!el || !rect) return;
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    let angle = (Math.atan2(mouseY, mouseX) * 180) / Math.PI;
    angle = (angle + 360) % 360;
    el.style.setProperty("--start", `${Math.round(angle + 60)}`);
  };

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      className="card card-border timeline-card rounded-2xl p-4 sm:p-5 break-inside-avoid-column"
    >
      <div className="glow" />
      {children}
    </div>
  );
};

export default GlowCard;
