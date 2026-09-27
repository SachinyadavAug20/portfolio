import type { techStackIconsProps } from "../../../../constants";
import { useGLTF, Environment, Float, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { isTouchDevice } from "../../../hooks/useNearViewport";

const TechIconCanvas = ({ model }: { model: techStackIconsProps }) => {
  const scene = useGLTF(model.modelPath);
  const isTouch = isTouchDevice();
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
    <Canvas>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="city" />
      {!isTouch && <OrbitControls enableZoom={false} />}
      <Float speed={5.5} rotationIntensity={2.5} floatIntensity={0.9}>
        <group scale={model.scale} rotation={model.rotation}>
          <primitive object={scene.scene} />
        </group>
      </Float>
    </Canvas>
  );
};

export default TechIconCanvas;
