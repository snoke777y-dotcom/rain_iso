import { describe, expect, it } from "vitest";

import { continuousPropagate } from "../../../app/infrastructure/rain_iso/cpu/continuous-propagate.js";

describe("continuousPropagate", () => {
  it("无活动锚点时仍能按波次补齐 rain_mask 内空白格", () => {
    const result = continuousPropagate({
      valueGrid: new Float32Array([5, 0, 0]),
      rainMask: new Uint8Array([1, 1, 1]),
      knownMask: new Uint8Array([1, 0, 0]),
      hardAnchorMask: new Uint8Array([0, 0, 0]),
      gridNeighbors: createLineNeighbors(3),
      gridCenterX: new Float32Array([0, 1000, 2000]),
      gridCenterY: new Float32Array([0, 0, 0]),
      ordinaryOnlyMode: true
    });

    expect(Array.from(result.valueGrid)).toEqual([5, 5, 5]);
    expect(Array.from(result.knownMask)).toEqual([1, 1, 1]);
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
