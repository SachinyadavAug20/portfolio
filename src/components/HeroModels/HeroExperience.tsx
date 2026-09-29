import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMediaQuery } from "react-responsive";
import { useMemo, useRef } from "react";
import { MyComputer } from "./MyComputer";
import HeroLights from "./HeroLights";
import { getTimeOfDay } from "../../lib/utils";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Partical } from "./Partical";
import { isTouchDevice } from "../../hooks/useNearViewport";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

const HeroExperience = ({ active = true }: { active?: boolean }) => {
  const isTablet = useMediaQuery({ query: "(max-width: 1024px)" });
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  // Matches the layout switch in `.hero-3d-layout`: below xl the canvas is a
  // compact in-flow strip, so the camera pulls in to keep the model prominent.
  const compact = useMediaQuery({ query: "(max-width: 1279px)" });
  const isTouch = isTouchDevice();
  const reduced = useReducedMotion();
  const tod = useMemo(() => getTimeOfDay(), []);
  const groupRef = useRef<THREE.Group>(null!);

  const cellColor = useMemo(() => {
    const c = new THREE.Color("#6b7280")
      .multiplyScalar(0.3 + 0.7 * tod.factor)
      .lerp(new THREE.Color(tod.color), 0.1);
    return c.getStyle();
  }, [tod]);

  const sectionColor = useMemo(() => {
    const c = new THREE.Color("#22d3ee")
      .multiplyScalar(0.4 + 0.6 * tod.factor)
      .lerp(new THREE.Color(tod.color), 0.2);
    return c.getStyle();
  }, [tod]);

  // Stable identities: prevents R3F from re-applying them on every `active`
  // flip (which would snap an orbited camera back to its default).
  const cameraProps = useMemo(
    () => ({
      position: (compact ? [0, 1.1, 4.2] : [0, 1.5, 7]) as [
        number,
        number,
        number,
      ],
      fov: 45,
    }),
    [compact],
  );
  const glProps = useMemo(
    () => ({
      antialias: !isTouch,
      powerPreference: (isTouch ? "low-power" : "high-performance") as WebGLPowerPreference,
    }),
    [isTouch],
  );

  useGSAP(
    () => {
      if (reduced || !groupRef.current) return;
      requestAnimationFrame(() => {
        if (!groupRef.current) return;
        groupRef.current.rotation.y = Math.PI * 2;
        gsap.to(groupRef.current.rotation, {
          y: 0,
          duration: 2,
          ease: "power3.out",
        });
      });
    },
    { dependencies: [reduced] },
  );

  return (
    <Canvas
      camera={cameraProps}
      dpr={isTouch ? [1, 1.5] : [1, 2]}
      gl={glProps}
      frameloop={reduced ? "demand" : active ? "always" : "never"}
    >
      <ambientLight intensity={0.05 + 0.25 * tod.factor} color={tod.color} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5 * tod.factor}
        color={tod.color}
      />
      <HeroLights />
      <Environment preset="city" />
      {!isMobile && <Partical count={40} spread={3} />}

      <Grid
        position={[0, -1, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={cellColor}
        sectionSize={2}
        sectionThickness={1}
        sectionColor={sectionColor}
        fadeDistance={20}
        infiniteGrid
      />

      {!isTouch && (
        <OrbitControls
          enablePan={false}
          enableZoom={!isTablet}
          maxDistance={12}
          minDistance={3}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
        />
      )}

      <group
        ref={groupRef}
        scale={compact ? 0.55 : 0.5}
        position={[0, compact ? 0 : -0.3, 0]}
      >
        <MyComputer todFactor={tod.factor} />
      </group>

      {!isTouch && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.35}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.2}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.22} darkness={0.72} />
        </EffectComposer>
      )}
    </Canvas>
  );
};

export default HeroExperience;
