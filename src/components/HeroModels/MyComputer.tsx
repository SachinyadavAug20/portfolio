import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useMemo, type JSX } from "react";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Object_2: THREE.Mesh;
  };
  materials: {
    palette: THREE.MeshStandardMaterial;
  };
};

export function MyComputer({
  todFactor = 0.5,
  ...props
}: { todFactor?: number } & JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/models/my_computer.glb",
  ) as unknown as GLTFResult;

  const computerMaterial = useMemo(() => {
    const mat = materials.palette.clone();
    mat.roughness = 0.15;
    mat.metalness = 0.7;
    mat.envMapIntensity = 1.5;
    return mat;
  }, [materials.palette]);

  const nightness = 1 - todFactor;

  return (
    <group {...props}>
      <mesh
        geometry={nodes.Object_2.geometry}
        material={computerMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh position={[0.12, 0.35, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshStandardMaterial
          color="#62e0ff"
          emissive="#62e0ff"
          emissiveIntensity={0.3 + nightness * 0.7}
          transparent
          opacity={0.4 + nightness * 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload("/models/my_computer.glb");
