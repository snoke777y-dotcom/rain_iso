import { describe, expect, it } from "vitest";

import { buildSeedGrid } from "../../../app/application/rain_iso/grids/build-seed-grid.js";

describe("ordinary only mode", () => {
  it("无活动锚点时同格普通站取最大值并标记 ordinary_only_mode", () => {
    const result = buildSeedGrid(
      {
        hardAnchorStations: [],
        fixedAnchorStations: [],
        dynamicAnchorStations: [],
        ordinaryStations: [station("ORD-1", 4), station("ORD-2", 11)],
        excludedStations: []
      },
      {
        assets: {
          manifest: {
            grid_count: 1
          } as never,
          gridMeta: {
            gridId: new Int32Array([0]),
            row: new Int32Array([0]),
            col: new Int32Array([0]),
            centerX: new Float32Array([0]),
            centerY: new Float32Array([0])
          },
          stationMeta: {
            station_count: 2,
            stations: [
              meta("ORD-1"),
              meta("ORD-2")
            ]
          },
          stationToGrid: new Int32Array([0, 0])
        }
      }
    );

    expect(result.valueGrid[0]).toBe(11);
    expect(result.softObsMask[0]).toBe(1);
    expect(result.ordinaryOnlyMode).toBe(true);
  });
});

function station(stationId: string, value: number) {
  return {
    stationId,
    longitude: 116,
    latitude: 40,
    value,
    status: "normal" as const,
    canBeDynamicAnchor: true
  };
}

function meta(stationId: string) {
  return {
    station_id: stationId,
    lon: 116,
    lat: 40,
    is_fortress_anchor: false,
    is_tongzhou_anchor: false,
    is_cross_boundary_anchor: false
  };
}
