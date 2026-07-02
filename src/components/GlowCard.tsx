import type { JSX } from "react/jsx-dev-runtime";
import type { expCardProps } from "../../constants";
import { useRef } from "react";

const GlowCard = ({
  card,
  children,
  index,
}: {
  card: expCardProps;
  children: JSX.Element;
  index: number;
}) => {
  const cardRef = useRef<(HTMLDivElement | null)[]>([]);
  const handleMouseMove =
    (index: number) => (el: React.MouseEvent<HTMLDivElement>) => {
      const carda = cardRef.current[index];
      if (!carda) return;
      // get mouse position relative to card
      const rect = carda.getBoundingClientRect();
      const mouseX = el.clientX - rect.left - rect.width / 2;
      const mouseY = el.clientY - rect.top - rect.height / 2;
      // angle
      let angle = Math.atan2(mouseY, mouseX);
      angle = (angle * 180) / Math.PI;
      angle = (angle + 360) % 360;
      // carda.style.transform=`rotate(${angle}deg)`;
      carda.style.setProperty("--start", `${angle + 60}`);
    };
  return (
    <div
      ref={(el) => {
        cardRef.current[index] = el;
      }}
      onMouseMove={handleMouseMove(index)}
      className="card card-border timeline-card rounded-xl p-10"
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
