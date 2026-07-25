import { OrbitControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMediaQuery } from "react-responsive";
import { useMemo, useRef } from "react";
import { MyComputer } from "./MyComputer";
import HeroLights from "./HeroLights";
import { getTimeOfDay } from "../../lib/utils";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Partical } from "./Partical";
import * as THREE from "three";

const HeroExperience = () => {
  const isTablet = useMediaQuery({ query: "(max-width: 1024px)" });
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  const tod = useMemo(() => getTimeOfDay(), []);
  const groupRef = useRef<THREE.Group>(null!);

  useGSAP(() => {
    requestAnimationFrame(() => {
      if (!groupRef.current) return;
      groupRef.current.rotation.y = Math.PI * 2;
      gsap.to(groupRef.current.rotation, {
        y: 0,
        duration: 2,
        ease: "power3.out",
      });
    });
  });

  return (
    <Canvas camera={{ position: [0, 1.5, 7], fov: 45 }}>
      <ambientLight intensity={0.05 + 0.25 * tod.factor} color={tod.color} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5 * tod.factor}
        color={tod.color}
      />
      <HeroLights />
      <Environment preset="city" />
      {!isMobile && <Partical count={40} spread={3} />}
      <OrbitControls
        enablePan={false}
        enableZoom={!isTablet}
        maxDistance={12}
        minDistance={3}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
      />

      <group
        ref={groupRef}
        scale={isMobile ? 0.3 : 0.5}
        position={[0, -0.3, 0]}
      >
        <MyComputer todFactor={tod.factor} />
      </group>
    </Canvas>
  );
};

export default HeroExperience;
