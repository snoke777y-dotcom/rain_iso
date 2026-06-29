import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { buildRainMask } from "../../../app/application/rain_iso/mask/build-rain-mask.js";

describe("buildRainMask", () => {
  it("扩张队列不依赖 Array.shift", () => {
    const originalShift = Array.prototype.shift;

    try {
      Array.prototype.shift = function overriddenShift() {
        throw new Error("shift should not be used");
      };

      const result = buildRainMask({
        frameType: FrameType.Accum1hStep,
        gridMask: new Uint8Array([1, 1, 1, 1]),
        gridNeighbors: createLineNeighbors(4),
        gridCenterX: new Float32Array([0, 1, 2, 3]),
        gridCenterY: new Float32Array([0, 0, 0, 0]),
        hardAnchorMask: new Uint8Array([1, 0, 0, 0]),
        softObsMask: new Uint8Array([0, 0, 1, 0]),
        radiusConfig: {
          minRadius: 1,
          maxRadius: 1,
          hardAnchorBonus: 0,
          expansionOffset: 0
        }
      });

      expect(Array.from(result.rainMask)).toEqual([1, 1, 1, 1]);
    } finally {
      Array.prototype.shift = originalShift;
    }
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
