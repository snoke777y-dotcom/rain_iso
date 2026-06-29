import { describe, expect, it } from "vitest";

import { buildSeedGrid } from "../../../app/application/rain_iso/grids/build-seed-grid.js";

describe("anchor first", () => {
  it("同格有锚点时锚点覆盖普通站", () => {
    const result = buildSeedGrid(
      {
        hardAnchorStations: [station("FIX-1", 8)],
        fixedAnchorStations: [station("FIX-1", 8)],
        dynamicAnchorStations: [],
        ordinaryStations: [station("ORD-1", 30)],
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
              meta("FIX-1"),
              meta("ORD-1")
            ]
          },
          stationToGrid: new Int32Array([0, 0])
        }
      }
    );

    expect(result.valueGrid[0]).toBe(8);
    expect(result.hardAnchorMask[0]).toBe(1);
    expect(result.softObsMask[0]).toBe(0);
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
