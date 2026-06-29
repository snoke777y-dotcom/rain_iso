export function createMemoryPool() {
    const free = new Map();
    function key(kind, length) {
        return `${kind}:${length}`;
    }
    function acquire(kind, length) {
        const poolKey = key(kind, length);
        const bucket = free.get(poolKey);
        const reused = bucket?.pop();
        if (reused) {
            reused.fill(0);
            return reused;
        }
        if (kind === "float32") {
            return new Float32Array(length);
        }
        if (kind === "uint8") {
            return new Uint8Array(length);
        }
        return new Int32Array(length);
    }
    return {
        acquire,
        release(array) {
            const kind = getKind(array);
            const poolKey = key(kind, array.length);
            const bucket = free.get(poolKey) ?? [];
            free.set(poolKey, bucket);
            bucket.push(array);
        },
        freeCount(kind, length) {
            return free.get(key(kind, length))?.length ?? 0;
        }
    };
}
function getKind(array) {
    if (array instanceof Float32Array) {
        return "float32";
    }
    if (array instanceof Uint8Array) {
        return "uint8";
    }
    return "int32";
}
