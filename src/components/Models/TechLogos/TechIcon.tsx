import type { techStackIconsProps } from "../../../../constants";
import { lazy, Suspense } from "react";
import { useNearViewport } from "../../../hooks/useNearViewport";

const TechIconCanvas = lazy(() => import("./TechIconCanvas"));

const TechIcon = ({ model }: { model: techStackIconsProps }) => {
  const { ref, near, visible } = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref} className="w-full h-full">
      {near && (
        <Suspense fallback={<div className="w-full h-full" />}>
          <TechIconCanvas model={model} active={visible} />
        </Suspense>
      )}
    </div>
  );
};

export default TechIcon;

// loads the '.glb' model + WebGL canvas only once the card scrolls near
// the viewport (keeps three.js out of the critical path on mobile)
