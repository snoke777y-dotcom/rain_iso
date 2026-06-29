import { describe, expect, it } from "vitest";

import { createMemoryPool } from "../../../app/shared/memory-pool.js";

describe("memory pool", () => {
  it("释放后的同规格数组会被复用，避免批量任务无界增长", () => {
    const pool = createMemoryPool();

    const first = pool.acquire("float32", 4);
    first[0] = 9;
    const reusedBuffer = first.buffer;
    pool.release(first);

    const second = pool.acquire("float32", 4);
    expect(second.buffer).toBe(reusedBuffer);
    expect(Array.from(second)).toEqual([0, 0, 0, 0]);

    const third = pool.acquire("float32", 8);
    expect(third.buffer).not.toBe(reusedBuffer);
  });
});
