export const wrap = (value: number, length: number): number =>
  ((value % length) + length) % length;

export const helixAngle = (progress: number, phase: number, turns: number): number =>
  progress * turns * 2 * Math.PI + phase;

// depth toward the camera, normalized 0 (far side) .. 1 (near side)
export const depthOf = (angle: number): number => (Math.cos(angle) + 1) / 2;

// stuck to the outside of the cylinder: rotate to the angle, then push outward
export const helixTransform = (angle: number, y: number, radius: number): string =>
  `translate(-50%, -50%) rotateY(${angle.toFixed(4)}rad) translateZ(${radius}px) translateY(${y.toFixed(1)}px)`;

export const depthFilter = (depth: number, brightnessFloor: number, maxBlur: number): string => {
  const brightness = brightnessFloor + (1 - brightnessFloor) * depth * depth;
  const blur = (1 - depth) * (1 - depth) * maxBlur;
  return `brightness(${brightness.toFixed(3)}) blur(${blur.toFixed(2)}px)`;
};
