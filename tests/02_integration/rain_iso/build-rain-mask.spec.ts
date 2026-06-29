import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { buildRainMask } from "../../../app/application/rain_iso/mask/build-rain-mask.js";

describe("buildRainMask", () => {
  it("从 hard_anchor_mask 和 soft_obs_mask 生成 known_mask，并与 grid_mask 相交", () => {
    const result = buildRainMask({
      frameType: FrameType.Rain5m,
      gridMask: new Uint8Array([1, 1, 0, 1, 1]),
      gridNeighbors: createLineNeighbors(5),
      gridCenterX: new Float32Array([0, 1000, 2000, 3000, 4000]),
      gridCenterY: new Float32Array([0, 0, 0, 0, 0]),
      hardAnchorMask: new Uint8Array([1, 0, 0, 0, 0]),
      softObsMask: new Uint8Array([0, 0, 0, 0, 1]),
      radiusConfig: {
        minRadius: 1,
        maxRadius: 1,
        hardAnchorBonus: 1
      }
    });

    expect(Array.from(result.knownMask)).toEqual([1, 0, 0, 0, 1]);
    expect(Array.from(result.rainMask)).toEqual([1, 1, 0, 1, 1]);
    expect(result.expansionRadius).toBe(1);
  });

  it("支持在估算半径基础上追加扩展偏移量", () => {
    const result = buildRainMask({
      frameType: FrameType.Rain5m,
      gridMask: new Uint8Array([1, 1, 1, 1, 1]),
      gridNeighbors: createLineNeighbors(5),
      gridCenterX: new Float32Array([0, 1000, 2000, 3000, 4000]),
      gridCenterY: new Float32Array([0, 0, 0, 0, 0]),
      hardAnchorMask: new Uint8Array([1, 0, 0, 0, 0]),
      softObsMask: new Uint8Array([0, 0, 0, 0, 0]),
      radiusConfig: {
        minRadius: 1,
        maxRadius: 1,
        expansionOffset: 1,
        hardAnchorBonus: 0
      }
    });

    expect(result.expansionRadius).toBe(2);
    expect(Array.from(result.rainMask)).toEqual([1, 1, 1, 0, 0]);
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
