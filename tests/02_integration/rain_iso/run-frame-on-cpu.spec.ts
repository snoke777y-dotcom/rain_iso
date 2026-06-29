import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { runFrameOnCpu } from "../../../app/application/rain_iso/use-cases/run-frame-on-cpu.js";
import type { DirectFrame } from "../../../app/application/rain_iso/series/build-5m-frames.js";
import type { RainIsoAssetBundle } from "../../../app/infrastructure/rain_iso/assets/asset-types.js";

describe("runFrameOnCpu", () => {
  it("串联预处理、锚点、落格、掩膜、传播、平滑和结果组装", async () => {
    const frame: DirectFrame = {
      frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
      frameType: FrameType.Rain5m,
      frameTime: "2026-06-24T13:55:00+08:00",
      stationIds: ["FIX-1", "ORD-1"],
      stationValues: new Float32Array([1.2, 0.8])
    };
    const assets = createAssets();

    const result = await runFrameOnCpu(frame, {
      assets,
      selectedBackend: "cpu"
    });

    expect(result.frameKey).toBe(frame.frameKey);
    expect(result.summary.renderableGridCount).toBe(3);
    expect(result.summary.hardAnchorCount).toBe(2);
    expect(result.summary.softObsCount).toBe(0);
    expect(result.summary.ordinaryOnlyMode).toBe(false);
    expect(result.hardAnchorMask[0]).toBe(1);
    expect(result.hardAnchorMask[2]).toBe(1);
    expect(result.rainMask[1]).toBe(1);
    expect(result.valueGrid[0]).toBeCloseTo(1.2, 6);
  });

  it("透传 rain mask 半径偏移量", async () => {
    const frame: DirectFrame = {
      frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
      frameType: FrameType.Rain5m,
      frameTime: "2026-06-24T13:55:00+08:00",
      stationIds: ["FIX-1"],
      stationValues: new Float32Array([1.2])
    };
    const result = await runFrameOnCpu(frame, {
      assets: createAssets(5),
      selectedBackend: "cpu",
      rainMaskRadiusConfig: {
        minRadius: 1,
        maxRadius: 1,
        expansionOffset: 1,
        hardAnchorBonus: 0
      }
    });

    expect(Array.from(result.rainMask)).toEqual([1, 1, 1, 0, 0]);
  });

  it("透传平滑参数", async () => {
    const frame: DirectFrame = {
      frameKey: "accum_1h_step|2026-06-19T23:00:00+08:00",
      frameType: FrameType.Accum1hStep,
      frameTime: "2026-06-19T23:00:00+08:00",
      stationIds: ["FIX-1", "ORD-1"],
      stationValues: new Float32Array([10, 2])
    };
    const assets = createAssets(5, [0, 4]);

    const baseline = await runFrameOnCpu(frame, {
      assets,
      selectedBackend: "cpu",
      rainMaskRadiusConfig: {
        minRadius: 5,
        maxRadius: 5,
        expansionOffset: 0,
        hardAnchorBonus: 0
      },
      smoothConfig: {
        rounds: 0
      }
    });
    const smoother = await runFrameOnCpu(frame, {
      assets,
      selectedBackend: "cpu",
      rainMaskRadiusConfig: {
        minRadius: 5,
        maxRadius: 5,
        expansionOffset: 0,
        hardAnchorBonus: 0
      },
      smoothConfig: {
        rounds: 6,
        softObsMaxDelta: 10
      }
    });

    expect(smoother.valueGrid[1]).toBeGreaterThan(baseline.valueGrid[1]);
    expect(smoother.valueGrid[0]).toBeCloseTo(baseline.valueGrid[0], 6);
  });
});

function createAssets(gridCount = 3): Pick<
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
  return createAssetsWithStationToGrid(gridCount, [0, 2]);
}

function createAssetsWithStationToGrid(
  gridCount: number,
  stationToGrid: number[]
): Pick<
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
    stationToGrid: new Int32Array(stationToGrid),
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
