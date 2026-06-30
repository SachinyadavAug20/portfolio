import * as THREE from "three";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

const DEFAULT_KEYWORDS = [
  "C", "C++", "JS", "TS", "Python",
  "Next.js", "React", "Node", "MongoDB", "Tailwind",
  "Zod", "Postman", "nvim", "Git", "Linux",
  "OAuth", "API", "Auth", "JWT", "REST",
  "DSA", "CRUD", "DB", "Schema", "MDX",
  "pointer", "malloc", "struct", "stack", "heap",
  "recursion", "memory",
  "BaseCase", "Dhun", "PriorityTask",
  "hook", "state", "effect", "props",
  "middleware", "layout", "route", "server", "client",
];

const COLORS = ["#4cc9f0", "#9d4edd", "#7209b7", "#ffffff", "#d90429"];

interface ParticleDatum {
  keyword: string;
  startX: number;
  startZ: number;
  startY: number;
  speed: number;
  rotSpeed: number;
  size: number;
  color: string;
}

type ParticalProps = React.JSX.IntrinsicElements["group"] & {
  count?: number;
  keywords?: string[];
  speed?: number;
  spread?: number;
};

export function Partical({
  count = 40,
  keywords = DEFAULT_KEYWORDS,
  speed = 0.5,
  spread = 5,
  ...props
}: ParticalProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const clock = useRef<number[]>([]);

  const kw = keywords.length > 0 ? keywords : ["*"];

  const particles = useMemo(() => {
    const data: ParticleDatum[] = [];
    for (let i = 0; i < count; i++) {
      data.push({
        keyword: kw[Math.floor(Math.random() * kw.length)],
        startX: (Math.random() - 0.5) * spread,
        startZ: (Math.random() - 0.5) * spread,
        startY: Math.random() * 8 + 3,
        speed: speed * (0.4 + Math.random() * 0.6),
        rotSpeed: (Math.random() - 0.5) * 0.5,
        size: 0.15 + Math.random() * 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    clock.current = data.map(() => -Math.random() * 10);
    return data;
  }, [count, keywords, speed, spread]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    particles.forEach((p, i) => {
      const mesh = group.children[i] as THREE.Mesh | undefined;
      if (!mesh) return;

      clock.current[i] += delta;
      const y = p.startY - clock.current[i] * p.speed;

      if (y < -4) {
        clock.current[i] = 0;
        mesh.position.x = (Math.random() - 0.5) * spread;
        mesh.position.z = (Math.random() - 0.5) * spread;
        mesh.position.y = p.startY;
      } else {
        mesh.position.y = y;
      }

      mesh.rotation.y += p.rotSpeed * delta;
    });
  });

  return (
    <group ref={groupRef} {...props}>
      {particles.map((p, i) => (
        <Text
          key={i}
          fontSize={p.size}
          color={p.color}
          position={[p.startX, p.startY, p.startZ]}
          anchorX="center"
          anchorY="middle"
        >
          {p.keyword}
        </Text>
      ))}
    </group>
  );
}
