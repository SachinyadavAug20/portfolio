import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three-stdlib";
import type { JSX } from "react";

type GLTFResult = GLTF & {
  nodes: {
    Object_2: THREE.Mesh;
  };
  materials: {
    palette: THREE.MeshStandardMaterial;
  };
};

export function MyComputer(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/models/my_computer.glb",
  ) as unknown as GLTFResult;

  return (
    <group {...props}>
      <mesh
        geometry={nodes.Object_2.geometry}
        material={materials.palette}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

useGLTF.preload("/models/my_computer.glb");
