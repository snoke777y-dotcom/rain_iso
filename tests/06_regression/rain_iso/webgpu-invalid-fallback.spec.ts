import { describe, expect, it, vi } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import type { DirectFrame } from "../../../app/application/rain_iso/series/build-5m-frames.js";
import type { RainIsoAssetBundle } from "../../../app/infrastructure/rain_iso/assets/asset-types.js";

vi.mock("../../../app/infrastructure/rain_iso/gpu/webgpu/continuous-propagate.js", () => ({
  continuousPropagateOnWebGpu: async (input: {
    valueGrid: Float32Array;
    knownMask: Uint8Array;
  }) => ({
    valueGrid: new Float32Array(input.valueGrid.length),
    knownMask: new Uint8Array(input.knownMask.length)
  })
}));

vi.mock("../../../app/infrastructure/rain_iso/gpu/webgpu/constrained-smooth.js", () => ({
  constrainedSmoothOnWebGpu: async (input: { valueGrid: Float32Array }) =>
    new Float32Array(input.valueGrid.length)
}));

describe("runFrameOnCpu WebGPU fallback", () => {
  it("WebGPU 结果明显异常时自动回退到 CPU", async () => {
    const { runFrameOnCpu } = await import(
      "../../../app/application/rain_iso/use-cases/run-frame-on-cpu.js"
    );
    const frame: DirectFrame = {
      frameKey: "accum_1h_step|2026-06-19T23:00:00+08:00",
      frameType: FrameType.Accum1hStep,
      frameTime: "2026-06-19T23:00:00+08:00",
      stationIds: ["FIX-1", "ORD-1"],
      stationValues: new Float32Array([10, 2])
    };

    const result = await runFrameOnCpu(frame, {
      assets: createAssets(),
      selectedBackend: "webgpu",
      rainMaskRadiusConfig: {
        minRadius: 5,
        maxRadius: 5,
        expansionOffset: 0,
        hardAnchorBonus: 0
      }
    });

    expect(result.selectedBackend).toBe("cpu");
    expect(result.summary.maxValue).toBeGreaterThan(0.1);
    expect(result.summary.renderableGridCount).toBeGreaterThan(0);
  });
});

function createAssets(gridCount = 5): Pick<
  RainIsoAssetBundle,
  | "manifest"
  | "gridMeta"
  | "gridMask"
  | "gridNeighbors"
  | "stationMeta"
  | "stationToGrid"
  | "fixedAnchorStationIds"
  | "fallbackNeighborStationIdsByStationId"
> {
  return {
    manifest: {
      grid_count: gridCount
    } as RainIsoAssetBundle["manifest"],
    gridMeta: {
      gridId: new Int32Array(Array.from({ length: gridCount }, (_, index) => index)),
      row: new Int32Array(Array.from({ length: gridCount }, () => 0)),
      col: new Int32Array(Array.from({ length: gridCount }, (_, index) => index)),
      centerX: new Float32Array(
        Array.from({ length: gridCount }, (_, index) => index * 1000)
      ),
      centerY: new Float32Array(Array.from({ length: gridCount }, () => 0))
    },
    gridMask: new Uint8Array(Array.from({ length: gridCount }, () => 1)),
    gridNeighbors: createLineNeighbors(gridCount),
    stationMeta: {
      station_count: 2,
      stations: [
        {
          station_id: "FIX-1",
          station_name: "Fix",
          lon: 116,
          lat: 40,
          is_fortress_anchor: false,
          is_tongzhou_anchor: false,
          is_cross_boundary_anchor: false
        },
        {
          station_id: "ORD-1",
          station_name: "Ord",
          lon: 116.01,
          lat: 40,
          is_fortress_anchor: false,
          is_tongzhou_anchor: false,
          is_cross_boundary_anchor: false
        }
      ]
    },
    stationToGrid: new Int32Array([0, 4]),
    fixedAnchorStationIds: new Set(["FIX-1"]),
    fallbackNeighborStationIdsByStationId: new Map()
  };
}

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
