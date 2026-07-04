import { OrbitControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Computer } from "./Computer";
import ContactLights from "./ContactLights";

const ContactExperience = () => {
  return (
    <Canvas camera={{ position: [0, 1.5, 10], fov: 45 }}>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} />
      <ContactLights />
      <Environment preset="city" />
      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={20}
      />
      <group scale={0.08} position={[0, -5, -4]}>
        <Computer />
      </group>
    </Canvas>
  );
};

export default ContactExperience;
