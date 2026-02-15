export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function historyInit<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] };
}

export function historyCanUndo<T>(h: HistoryState<T>) {
  return h.past.length > 0;
}

export function historyCanRedo<T>(h: HistoryState<T>) {
  return h.future.length > 0;
}

export function historyPush<T>(h: HistoryState<T>, nextPresent: T, limit = 80): HistoryState<T> {
  if (Object.is(h.present, nextPresent)) return h;
  const past = [...h.past, h.present];
  const trimmedPast = past.length > limit ? past.slice(past.length - limit) : past;
  return { past: trimmedPast, present: nextPresent, future: [] };
}

export function historyUndo<T>(h: HistoryState<T>): HistoryState<T> {
  if (!historyCanUndo(h)) return h;
  const past = [...h.past];
  const previous = past.pop() as T;
  return { past, present: previous, future: [h.present, ...h.future] };
}

export function historyRedo<T>(h: HistoryState<T>): HistoryState<T> {
  if (!historyCanRedo(h)) return h;
  const [next, ...rest] = h.future;
  return { past: [...h.past, h.present], present: next, future: rest };
}
