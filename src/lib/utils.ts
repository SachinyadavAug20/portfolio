import * as THREE from "three";

type Keyframe = {
  hour: number;
  color: string;
  intensity: number;
};

const KEYFRAMES: Keyframe[] = [
  { hour: 0, color: "#0a0a2e", intensity: 1 },
  { hour: 5, color: "#0a0a2e", intensity: 1 },
  { hour: 6, color: "#ff8844", intensity: 4 },
  { hour: 8, color: "#ffeedd", intensity: 7 },
  { hour: 12, color: "#ffffff", intensity: 10 },
  { hour: 17, color: "#ffeedd", intensity: 7 },
  { hour: 18, color: "#ff6633", intensity: 5 },
  { hour: 20, color: "#442266", intensity: 2 },
  { hour: 24, color: "#0a0a2e", intensity: 1 },
];

export function getTimeOfDay() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  let prev = KEYFRAMES[0];
  let next = KEYFRAMES[KEYFRAMES.length - 1];

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (hour >= KEYFRAMES[i].hour && hour < KEYFRAMES[i + 1].hour) {
      prev = KEYFRAMES[i];
      next = KEYFRAMES[i + 1];
      break;
    }
  }

  const range = next.hour - prev.hour;
  const t = range > 0 ? (hour - prev.hour) / range : 0;

  const color = new THREE.Color(prev.color).lerp(
    new THREE.Color(next.color),
    t,
  );
  const intensity = prev.intensity + (next.intensity - prev.intensity) * t;

  const factor = (intensity - 1) / 9;

  return { hour, color, intensity, factor };
}
