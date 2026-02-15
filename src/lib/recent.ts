const KEY = 'design-arena:worktree-recent-searches:v1';

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === 'string').slice(0, 8);
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  const current = loadRecentSearches();
  const next = [q, ...current.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearRecentSearches() {
  localStorage.removeItem(KEY);
}
