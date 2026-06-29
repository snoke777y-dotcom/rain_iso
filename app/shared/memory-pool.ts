type PooledArray = Float32Array | Uint8Array | Int32Array;
type ArrayKind = "float32" | "uint8" | "int32";

export function createMemoryPool() {
  const free = new Map<string, PooledArray[]>();

  function key(kind: ArrayKind, length: number) {
    return `${kind}:${length}`;
  }

  function acquire(kind: "float32", length: number): Float32Array;
  function acquire(kind: "uint8", length: number): Uint8Array;
  function acquire(kind: "int32", length: number): Int32Array;
  function acquire(kind: ArrayKind, length: number): PooledArray {
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
    release(array: PooledArray): void {
      const kind = getKind(array);
      const poolKey = key(kind, array.length);
      const bucket = free.get(poolKey) ?? [];
      free.set(poolKey, bucket);
      bucket.push(array);
    },
    freeCount(kind: ArrayKind, length: number): number {
      return free.get(key(kind, length))?.length ?? 0;
    }
  };
}

function getKind(array: PooledArray): ArrayKind {
  if (array instanceof Float32Array) {
    return "float32";
  }
  if (array instanceof Uint8Array) {
    return "uint8";
  }
  return "int32";
}
