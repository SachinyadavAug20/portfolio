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

/**
 * Fire a toast without pulling sonner into the entry bundle. The shared
 * Toaster mounts async from RootLayout; we wait for it (bounded) so the
 * message is never swallowed, then the sonner chunk comes along for the ride.
 */
export async function notify(
  kind: NotifyKind,
  message: string,
  opts?: NotifyOpts,
): Promise<void> {
  const sonner = import("sonner");
  await Promise.race([ready, new Promise<void>((r) => setTimeout(r, 2000))]);
  const { toast } = await sonner;
  toast[kind](message, opts);
}
