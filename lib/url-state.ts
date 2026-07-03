// Shareable, no-backend state: calculator inputs live in the URL query string.
// Writes are debounced because Safari throttles history.replaceState calls.

let pending: Record<string, string | null> = {};
let timer: ReturnType<typeof setTimeout> | null = null;

export function readUrlParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function writeUrlParams(updates: Record<string, string | null>): void {
  if (typeof window === "undefined") return;
  pending = { ...pending, ...updates };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(pending)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    pending = {};
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, 400);
}
