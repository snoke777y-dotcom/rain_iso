import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { buildRainMask } from "../../../app/application/rain_iso/mask/build-rain-mask.js";

describe("rain mask overflow", () => {
  it("局地已知格不会被错误扩成整张网格", () => {
    const result = buildRainMask({
      frameType: FrameType.Rain5m,
      gridMask: new Uint8Array(Array.from({ length: 8 }, () => 1)),
      gridNeighbors: createLineNeighbors(8),
      gridCenterX: new Float32Array(
        Array.from({ length: 8 }, (_, index) => index * 1000)
      ),
      gridCenterY: new Float32Array(Array.from({ length: 8 }, () => 0)),
      hardAnchorMask: new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]),
      softObsMask: new Uint8Array(Array.from({ length: 8 }, () => 0)),
      radiusConfig: {
        minRadius: 1,
        maxRadius: 1,
        hardAnchorBonus: 1
      }
    });

    expect(Array.from(result.rainMask)).toEqual([1, 1, 1, 0, 0, 0, 0, 0]);
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
