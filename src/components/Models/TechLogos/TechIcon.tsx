import type { techStackIconsProps } from "../../../../constants";
import { useGLTF, Environment, Float } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";

const TechIcon = ({ model }: { model: techStackIconsProps }) => {
  const scene = useGLTF(model.modelPath);
  useEffect(()=>{
    if(model.name=='Interactive Developer'){
      scene.scene.traverse((child)=>{
        if(child.isMesh && child.name === 'Object_5'){
          child.material=new THREE.MeshStandardMaterial({color:'white'})
        }
      })
    }
  })
  return (
    <Canvas>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="city" />
      <OrbitControls enableZoom={false} />
      <Float speed={5.5} rotationIntensity={2.5} floatIntensity={0.9}>
        <group scale={model.scale} rotation={model.rotation}>
          <primitive object={scene.scene} />
        </group>
      </Float>
    </Canvas>
  );
};

export default TechIcon;

// load a '.glb' model (GLTF format)
// adds basic lightning
// applies envioronment reflection for realistic look => Environment(city)
// wrap the model in floating animation
// optionally tweak the material
// disable zoom using orbit control
