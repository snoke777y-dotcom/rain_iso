import { describe, expect, it } from "vitest";

import { applyRenderThreshold } from "../../../app/application/rain_iso/results/apply-render-threshold.js";

describe("applyRenderThreshold", () => {
  it("将小于 0.1mm 的格点置为 NaN，并同步关闭 rain_mask", () => {
    const result = applyRenderThreshold({
      valueGrid: new Float32Array([0.05, 0.1, 0.2]),
      rainMask: new Uint8Array([1, 1, 1]),
      threshold: 0.1
    });

    expect(Number.isNaN(result.valueGrid[0])).toBe(true);
    expect(result.rainMask[0]).toBe(0);
    expect(result.valueGrid[1]).toBeCloseTo(0.1, 6);
    expect(result.rainMask[1]).toBe(1);
    expect(result.valueGrid[2]).toBeCloseTo(0.2, 6);
    expect(result.rainMask[2]).toBe(1);
  });
});
