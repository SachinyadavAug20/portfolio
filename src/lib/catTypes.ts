/*
 * Shared context the cat's brain reads when choosing a line.
 * Tracked live in CatCompanion (route, scroll, pets, typing tempo…).
 */
export interface CatContext {
  /** current route pathname */
  path: string;
  /** local hour, 0–23 */
  hour: number;
  /** deepest scroll depth reached on this page, 0–100 */
  scrollPct: number;
  /** routes visited this session */
  visits: number;
  /** lifetime pet count (localStorage) */
  pets: number;
  /** true while the dark theme is active */
  dark: boolean;
  /** recent keypresses per second (0 = idle) */
  keyRate: number;
}
