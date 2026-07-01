import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMediaQuery } from "react-responsive";
import { useMemo, useRef } from "react";
import { Room } from "./Room";
import HeroLights from "./HeroLights";
import { getTimeOfDay } from "../../lib/utils";
import { useGSAP } from "@gsap/react";
import { Partical } from "./Partical";
import * as THREE from "three";

const HeroExperience = () => {
  const isTablet = useMediaQuery({ query: "(max-width: 1024px)" });
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const tod = useMemo(() => getTimeOfDay(), []);
  const groupRef = useRef<THREE.Group>(null!);

  useGSAP(() => {
    requestAnimationFrame(() => {
      groupRef.current.rotation.y = Math.PI * 2;
      gsap.to(groupRef.current.rotation, {
        y: -Math.PI / 4,
        duration: 2.5,
        ease: "power3.out",
      });
    });
  });

  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
      <ambientLight intensity={0.05 + 0.25 * tod.factor} color={tod.color} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5 * tod.factor}
        color={tod.color}
      />
      <HeroLights />
      <Partical count={50} />
      <OrbitControls
        enablePan={false}
        enableZoom={!isTablet}
        maxDistance={20}
        minDistance={5}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2}
      />

      <group
        ref={groupRef}
        scale={isMobile ? 0.4 : 0.8}
        position={[0, -3.5, 0]}
        rotation={[0, -Math.PI / 4, 0]}
      >
        <Room />
      </group>
    </Canvas>
  );
};

export default HeroExperience;
