/**
 * Light haptic tick for key interactions (native-app feel).
 * No-op where the Vibration API is unavailable (iOS Safari, desktop).
 */
export function tap(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined") return;
  const vibrate = navigator.vibrate?.bind(navigator);
  if (!vibrate) return;
  try {
    vibrate(pattern);
  } catch {
    // Ignore invalid patterns / battery-saver blocks.
  }
}
