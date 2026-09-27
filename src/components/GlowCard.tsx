import type { JSX } from "react/jsx-dev-runtime";
import type { expCardProps, testimonialProps } from "../../constants";
import { useEffect, useRef } from "react";

const GlowCard = ({
  card,
  children,
  index,
}: {
  card: expCardProps | testimonialProps;
  children: JSX.Element;
  index: number;
}) => {
  const cardRef = useRef<(HTMLDivElement | null)[]>([]);
  const rectRef = useRef<{ el: HTMLDivElement; rect: DOMRect } | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const c = rectRef.current;
      if (c) c.rect = c.el.getBoundingClientRect();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handlePointerEnter = (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (e.pointerType !== "mouse") return;
    const el = cardRef.current[index];
    if (!el) return;
    rectRef.current = { el, rect: el.getBoundingClientRect() };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const c = rectRef.current;
    if (!c || c.el !== cardRef.current[index]) return;
    const rect = c.rect;
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(mouseY, mouseX);
    angle = (angle * 180) / Math.PI;
    angle = (angle + 360) % 360;
    c.el.style.setProperty("--start", `${angle + 60}`);
  };

  return (
    <div
      ref={(el) => {
        cardRef.current[index] = el;
      }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      className="card card-border timeline-card rounded-xl p-6 sm:p-10 mb-5 bread-inside-avoid-column"
    >
      <div className="glow" />
      <div className="flex items-center gap-1 mb-5">
        {Array.from({ length: 5 }, (_, i) => (
          <img src="/images/star.png" key={i} alt="star" className="size-5" />
        ))}
      </div>
      <div className="mb-5">
        <p className="text-white-50 text-lg">{card.review}</p>
      </div>
      {children}
    </div>
  );
};

export default GlowCard;
