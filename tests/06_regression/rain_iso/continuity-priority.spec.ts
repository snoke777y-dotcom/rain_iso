import { describe, expect, it } from "vitest";

import { continuousPropagate } from "../../../app/infrastructure/rain_iso/cpu/continuous-propagate.js";

describe("continuity priority", () => {
  it("同时存在锚点参考值时，仍优先选择更接近邻域主导值的候选值", () => {
    const result = continuousPropagate({
      valueGrid: new Float32Array([
        0, 8, 0,
        8, 0, 20,
        0, 8, 0
      ]),
      rainMask: new Uint8Array([
        0, 1, 0,
        1, 1, 1,
        0, 1, 0
      ]),
      knownMask: new Uint8Array([
        0, 1, 0,
        1, 0, 1,
        0, 1, 0
      ]),
      hardAnchorMask: new Uint8Array([
        0, 0, 0,
        0, 0, 1,
        0, 0, 0
      ]),
      gridNeighbors: createCrossNeighbors3x3(),
      gridCenterX: new Float32Array([
        0, 1000, 2000,
        0, 1000, 2000,
        0, 1000, 2000
      ]),
      gridCenterY: new Float32Array([
        0, 0, 0,
        1000, 1000, 1000,
        2000, 2000, 2000
      ]),
      ordinaryOnlyMode: false
    });

    expect(result.valueGrid[4]).toBe(8);
    expect(result.knownMask[4]).toBe(1);
  });
});

function createCrossNeighbors3x3(): Int32Array {
  const neighbors = new Int32Array(9 * 8).fill(-1);
  const links: Record<number, number[]> = {
    1: [4],
    3: [4],
    4: [1, 3, 5, 7],
    5: [4],
    7: [4]
  };

  for (const [gridIdText, neighborIds] of Object.entries(links)) {
    const gridId = Number(gridIdText);
    neighborIds.forEach((neighborId, index) => {
      neighbors[gridId * 8 + index] = neighborId;
    });
  }

  return neighbors;
}
