export function createFrameCache(options) {
    const entries = new Map();
    function key(taskId, frameKey) {
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
        set(taskId, frameKey, frameResult) {
            const cacheKey = key(taskId, frameKey);
            entries.delete(cacheKey);
            entries.set(cacheKey, frameResult);
            evictIfNeeded();
        },
        get(taskId, frameKey) {
            const cacheKey = key(taskId, frameKey);
            const value = entries.get(cacheKey);
            if (!value) {
                return null;
            }
            entries.delete(cacheKey);
            entries.set(cacheKey, value);
            return value;
        },
        release(taskId, frameKeys) {
            for (const frameKey of frameKeys) {
                entries.delete(key(taskId, frameKey));
            }
        },
        clearTask(taskId) {
            for (const cacheKey of entries.keys()) {
                if (cacheKey.startsWith(`${taskId}\n`)) {
                    entries.delete(cacheKey);
                }
            }
        },
        size() {
            return entries.size;
        }
    };
}
