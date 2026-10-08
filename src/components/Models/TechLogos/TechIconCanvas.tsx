import type { techStackIconsProps } from "../../../../constants";
import { useGLTF, Environment, Float, OrbitControls, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { isTouchDevice } from "../../../hooks/useNearViewport";
import { useReducedMotion } from "../../../hooks/useReducedMotion";

const TechIconCanvas = ({
  model,
  active = true,
}: {
  model: techStackIconsProps;
  active?: boolean;
}) => {
  const scene = useGLTF(model.modelPath);
  const isTouch = isTouchDevice();
  const reduced = useReducedMotion();
  const glProps = useMemo(
    () => ({
      antialias: !isTouch,
      powerPreference: (isTouch ? "low-power" : "high-performance") as WebGLPowerPreference,
    }),
    [isTouch],
  );
  useEffect(() => {
    if (model.name == "Interactive Developer") {
      scene.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === "Object_5") {
          child.material = new THREE.MeshStandardMaterial({ color: "white" });
        }
      });
    }
  });
  return (
    <Canvas
      dpr={isTouch ? [1, 1.25] : [1, 2]}
      gl={glProps}
      frameloop={reduced ? "demand" : active ? "always" : "never"}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      {/* procedural studio light — no preset HDR download per icon canvas */}
      <Environment resolution={128} frames={1}>
        <color attach="background" args={["#10141c"]} />
        <Lightformer intensity={2} position={[0, 4, -6]} scale={[8, 6, 1]} color="#eef3ff" />
        <Lightformer intensity={1} position={[5, 1, 2]} rotation-y={-Math.PI / 3} scale={[5, 5, 1]} color="#ffd9b8" />
        <Lightformer intensity={1} position={[-5, 1, 2]} rotation-y={Math.PI / 3} scale={[5, 5, 1]} color="#bcd3ff" />
      </Environment>
      {!isTouch && <OrbitControls enableZoom={false} />}
      {reduced ? (
        <group scale={model.scale} rotation={model.rotation}>
          <primitive object={scene.scene} />
        </group>
      ) : (
        <Float speed={5.5} rotationIntensity={2.5} floatIntensity={0.9}>
          <group scale={model.scale} rotation={model.rotation}>
            <primitive object={scene.scene} />
          </group>
        </Float>
      )}
    </Canvas>
  );
};

export default TechIconCanvas;
