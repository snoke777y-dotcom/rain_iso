import type { FrameResult } from "../../../domain/rain_iso/models.js";

export type FrameCache = ReturnType<typeof createFrameCache>;

export function createFrameCache(options: {
  maxEntries: number;
}) {
  const entries = new Map<string, FrameResult>();

  function key(taskId: string, frameKey: string) {
    return `${taskId}\n${frameKey}`;
  }

  function evictIfNeeded() {
    while (entries.size > options.maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      entries.delete(oldestKey);
    }
  }

  return {
    set(taskId: string, frameKey: string, frameResult: FrameResult): void {
      const cacheKey = key(taskId, frameKey);
      entries.delete(cacheKey);
      entries.set(cacheKey, frameResult);
      evictIfNeeded();
    },
    get(taskId: string, frameKey: string): FrameResult | null {
      const cacheKey = key(taskId, frameKey);
      const value = entries.get(cacheKey);
      if (!value) {
        return null;
      }

      entries.delete(cacheKey);
      entries.set(cacheKey, value);
      return value;
    },
    release(taskId: string, frameKeys: string[]): void {
      for (const frameKey of frameKeys) {
        entries.delete(key(taskId, frameKey));
      }
    },
    clearTask(taskId: string): void {
      for (const cacheKey of entries.keys()) {
        if (cacheKey.startsWith(`${taskId}\n`)) {
          entries.delete(cacheKey);
        }
      }
    },
    size(): number {
      return entries.size;
    }
  };
}
