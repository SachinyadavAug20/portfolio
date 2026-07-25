import { useMemo } from "react";
import { getTimeOfDay } from "../../lib/utils";

const HeroLights = () => {
  const tod = useMemo(() => getTimeOfDay(), []);

  const accent = (base: number) => base * (0.9 - 0.85 * tod.factor);

  return (
    <>
      <spotLight
        position={[2, 3, 4]}
        intensity={tod.intensity * 5}
        angle={0.2}
        penumbra={0.3}
        color={tod.color}
      />
      <spotLight
        position={[3, 2, 4]}
        angle={0.4}
        intensity={accent(20)}
        penumbra={0.5}
        color="#4cc9f0"
      />
      <spotLight
        position={[-2, 3, 3]}
        angle={0.5}
        intensity={accent(25)}
        penumbra={1}
        color="#9d4edd"
      />
      <rectAreaLight
        color={tod.color}
        intensity={tod.intensity * 0.5}
        width={2}
        height={1.5}
        position={[1, 2, 3]}
        rotation={[-Math.PI / 4, Math.PI / 4, 0]}
      />
      <pointLight
        position={[0, 0.5, 0]}
        intensity={accent(8)}
        color="#7209b7"
      />
      <pointLight
        position={[1, 1, -1.5]}
        intensity={accent(8)}
        color="#0d00a4"
      />
    </>
  );
};

export default HeroLights;
