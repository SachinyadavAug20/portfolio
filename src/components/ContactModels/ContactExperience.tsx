import { OrbitControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { Computer } from "./Computer";
import ContactLights from "./ContactLights";
import { isTouchDevice } from "../../hooks/useNearViewport";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const ContactExperience = ({
  submitted,
  active = true,
}: {
  submitted: boolean;
  active?: boolean;
}) => {
  const isTouch = isTouchDevice();
  const reduced = useReducedMotion();
  // Stable identity so an `active` flip never re-applies renderer props.
  const cameraProps = useMemo(
    () => ({ position: [0, 1.5, 10] as [number, number, number], fov: 45 }),
    [],
  );
  const glProps = useMemo(
    () => ({
      antialias: !isTouch,
      powerPreference: (isTouch ? "low-power" : "high-performance") as WebGLPowerPreference,
    }),
    [isTouch],
  );

  return (
    <Canvas
      camera={cameraProps}
      shadows={!isTouch}
      dpr={isTouch ? [1, 1.5] : [1, 2]}
      gl={glProps}
      frameloop={reduced ? "demand" : active ? "always" : "never"}
    >
      <ambientLight intensity={0.5} color="#fff4e6" />
      <directionalLight position={[5, 5, 3]} intensity={2.5} color="#ffd9b3" />
      <directionalLight
        position={[5, 9, 1]}
        castShadow
        intensity={2.5}
        color="#ffd9b3"
      />
      <ContactLights />
      <Environment preset="night"/>
      {!isTouch && (
        <OrbitControls
          enableZoom={false}
          minDistance={5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          maxDistance={20}
        />
      )}
      <group scale={0.05} position={[0, -3, -4]} castShadow>
        <Computer submitted={submitted} />
      </group>
      <group scale={[1, 1, 1]}>
        <mesh
          receiveShadow
          position={[0, -3, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#a46b2d" />
        </mesh>
      </group>
    </Canvas>
  );
};

export default ContactExperience;
