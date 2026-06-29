import { describe, expect, it } from "vitest";

import { constrainedSmooth } from "../../../app/infrastructure/rain_iso/cpu/constrained-smooth.js";

describe("soft observation bounded", () => {
  it("软观测格的改变量受 softObsMaxDelta 限制", () => {
    const result = constrainedSmooth({
      valueGrid: new Float32Array([30, 10, 30]),
      rainMask: new Uint8Array([1, 1, 1]),
      hardAnchorMask: new Uint8Array([0, 0, 0]),
      softObsMask: new Uint8Array([0, 1, 0]),
      gridNeighbors: createLineNeighbors(3),
      rounds: 1,
      softObsMaxDelta: 2
    });

    expect(result[1]).toBe(12);
  });

  it("软观测格若是局部峰值，平滑后不能低于原始量级", () => {
    const result = constrainedSmooth({
      valueGrid: new Float32Array([10, 50, 10]),
      rainMask: new Uint8Array([1, 1, 1]),
      hardAnchorMask: new Uint8Array([0, 0, 0]),
      softObsMask: new Uint8Array([0, 1, 0]),
      gridNeighbors: createLineNeighbors(3),
      rounds: 1,
      softObsMaxDelta: 20
    });

    expect(result[1]).toBe(50);
  });

  it("软观测格平滑后不允许低于原始观测值", () => {
    const result = constrainedSmooth({
      valueGrid: new Float32Array([10, 40, 50]),
      rainMask: new Uint8Array([1, 1, 1]),
      hardAnchorMask: new Uint8Array([0, 0, 0]),
      softObsMask: new Uint8Array([0, 1, 0]),
      gridNeighbors: createLineNeighbors(3),
      rounds: 1,
      softObsMaxDelta: 20
    });

    expect(result[1]).toBe(40);
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
