type NotifyKind = "success" | "error";

interface NotifyOpts {
  description?: string;
}

let readyResolve: (() => void) | null = null;
const ready = new Promise<void>((resolve) => {
  readyResolve = resolve;
});

/** Called by <Toaster /> the moment it subscribes — sonner drops toasts fired before mount. */
export function markToasterReady(): void {
  readyResolve?.();
}

/* The Toaster itself now mounts on first request: until someone actually
   fires a toast, sonner's 30KB chunk stays off every page's load. RootLayout
   subscribes here; the flag also seeds its initial state so a subscriber
   that arrives after the first notify never misses the mount. */
let toasterWanted = false;
const wantedSubs = new Set<() => void>();

export const isToasterWanted = (): boolean => toasterWanted;

const wantToaster = (): void => {
  if (toasterWanted) return;
  toasterWanted = true;
  for (const fn of wantedSubs) fn();
};

/** RootLayout subscribes on mount; returns an unsubscribe for the cleanup. */
export const onToasterWanted = (fn: () => void): (() => void) => {
  wantedSubs.add(fn);
  return () => {
    wantedSubs.delete(fn);
  };
};

/**
 * Fire a toast without pulling sonner into the entry bundle. The first call
 * mounts the shared Toaster (async chunk); we wait for it (bounded) so the
 * message is never swallowed, then the sonner chunk comes along for the ride.
 */
export async function notify(
  kind: NotifyKind,
  message: string,
  opts?: NotifyOpts,
): Promise<void> {
  wantToaster();
  const sonner = import("sonner");
  await Promise.race([ready, new Promise<void>((r) => setTimeout(r, 2000))]);
  const { toast } = await sonner;
  toast[kind](message, opts);
}
