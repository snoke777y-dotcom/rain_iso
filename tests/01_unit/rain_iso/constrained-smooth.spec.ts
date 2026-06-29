import { describe, expect, it } from "vitest";

import { constrainedSmooth } from "../../../app/infrastructure/rain_iso/cpu/constrained-smooth.js";

describe("constrainedSmooth", () => {
  it("普通补全格会在 rain_mask 内向邻域均值平滑", () => {
    const result = constrainedSmooth({
      valueGrid: new Float32Array([10, 50, 10]),
      rainMask: new Uint8Array([1, 1, 1]),
      hardAnchorMask: new Uint8Array([0, 0, 0]),
      softObsMask: new Uint8Array([0, 0, 0]),
      gridNeighbors: createLineNeighbors(3),
      rounds: 1,
      softObsMaxDelta: 2
    });

    expect(result[1]).toBeCloseTo(23.333, 3);
  });
});

function createLineNeighbors(gridCount: number): Int32Array {
  const neighbors = new Int32Array(gridCount * 8).fill(-1);
  for (let index = 0; index < gridCount; index += 1) {
    if (index > 0) {
      neighbors[index * 8] = index - 1;
    }
    if (index < gridCount - 1) {
      neighbors[index * 8 + 1] = index + 1;
    }
  }
  return neighbors;
}
