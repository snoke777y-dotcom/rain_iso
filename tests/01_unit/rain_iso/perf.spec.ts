import { describe, expect, it } from "vitest";

import { summarizeDurations, trimWarmupSamples } from "../../../app/shared/perf.js";

describe("perf helpers", () => {
  it("剔除预热样本后保留正式采样", () => {
    expect(trimWarmupSamples([9, 8, 4, 5, 6], 2)).toEqual([4, 5, 6]);
    expect(trimWarmupSamples([1, 2], 5)).toEqual([]);
  });

  it("输出中位数和均值统计", () => {
    expect(summarizeDurations([5, 1, 3, 7])).toEqual({
      sampleCount: 4,
      minMs: 1,
      medianMs: 4,
      averageMs: 4,
      maxMs: 7
    });
  });
});
