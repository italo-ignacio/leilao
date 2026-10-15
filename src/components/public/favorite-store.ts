const storageKey = "leiloes-rfb:favorites:v1";
const listeners = new Set<() => void>();
const emptySnapshot: string[] = [];
let cachedSignature = "";
let cachedSnapshot = emptySnapshot;

function readFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item): item is string => typeof item === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)))].slice(0, 30);
  } catch {
    return [];
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

export function getFavoriteSlugs() {
  const next = readFavorites();
  const signature = JSON.stringify(next);
  if (signature !== cachedSignature) {
    cachedSignature = signature;
    cachedSnapshot = next;
  }
  return cachedSnapshot;
}

export function getServerFavoriteSlugs() {
  return emptySnapshot;
}

export function subscribeToFavorites(listener: () => void) {
  return subscribe(listener);
}

export function isFavorite(slug: string) {
  return readFavorites().includes(slug);
}

export function toggleFavorite(slug: string) {
  const current = getFavoriteSlugs();
  const next = current.includes(slug) ? current.filter((entry) => entry !== slug) : [slug, ...current].slice(0, 30);
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    notify();
    return next.includes(slug);
  } catch {
    return current.includes(slug);
  }
}

export function removeUnavailableFavorites(availableSlugs: string[]) {
  const available = new Set(availableSlugs);
  const current = getFavoriteSlugs();
  const next = current.filter((slug) => available.has(slug));
  if (next.length !== current.length) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      notify();
    } catch {}
  }
}