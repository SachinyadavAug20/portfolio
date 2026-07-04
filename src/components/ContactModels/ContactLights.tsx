import { useMemo } from "react";
import { getTimeOfDay } from "../../lib/utils";

const ContactLights = () => {
  const tod = useMemo(() => getTimeOfDay(), []);

  const accent = (base: number) => base * (0.8 - 0.7 * tod.factor);

  return (
    <>
      <spotLight
        position={[2, 5, 6]}
        intensity={tod.intensity * 0.12}
        angle={0.15}
        penumbra={0.2}
        color={tod.color}
      />
      <spotLight
        position={[4, 5, 6]}
        angle={0.3}
        intensity={accent(1.5)}
        penumbra={0.5}
        color="#4cc9f0"
      />
      <spotLight
        position={[-3, 5, 5]}
        angle={0.4}
        intensity={accent(2)}
        penumbra={1}
        color="#9d4edd"
      />
      <rectAreaLight
        color={tod.color}
        intensity={tod.intensity * 0.05}
        width={2}
        height={1.5}
        position={[1, 3, 4]}
        rotation={[-Math.PI / 4, Math.PI / 4, 0]}
      />
      <pointLight
        position={[0, 1, 0]}
        intensity={accent(0.4)}
        color="#7209b7"
      />
      <pointLight
        position={[1, 2, -2]}
        intensity={accent(0.4)}
        color="#0d00a4"
      />
    </>
  );
};

export default ContactLights;
