let datesCachePromise: Promise<Record<string, string>> | null = null;

/**
 * Cached singleton fetch for dates.json (slug -> ISO timestamp mapping).
 * Fetches at most once across the entire session to prevent duplicate network calls.
 */
export function getBlogDates(): Promise<Record<string, string>> {
  if (!datesCachePromise) {
    datesCachePromise = fetch("/dates.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { dates?: Record<string, string> } | null) => data?.dates || {})
      .catch(() => ({}));
  }
  return datesCachePromise;
}
