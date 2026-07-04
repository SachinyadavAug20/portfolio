import { OrbitControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Computer } from "./Computer";
import ContactLights from "./ContactLights";

const ContactExperience = () => {
  return (
    <Canvas camera={{ position: [0, 1.5, 10], fov: 45 }} shadows>
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
      <OrbitControls
        enableZoom={false}
        minDistance={5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        maxDistance={20}
      />
      <group scale={0.05} position={[0, -3, -4]} castShadow>
        <Computer />
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
