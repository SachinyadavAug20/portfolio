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

  const computerMaterial = materials.palette.clone();
  computerMaterial.roughness = 0.4;
  computerMaterial.metalness = 0.3;
  computerMaterial.envMapIntensity = 0.6;

  return (
    <group {...props}>
      <mesh
        geometry={nodes.Object_2.geometry}
        material={computerMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

useGLTF.preload("/models/my_computer.glb");
