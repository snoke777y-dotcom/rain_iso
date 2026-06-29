import { describe, expect, it } from "vitest";

import { buildSeedGrid } from "../../../app/application/rain_iso/grids/build-seed-grid.js";
import type { AnchorSets } from "../../../app/application/rain_iso/anchors/build-anchor-sets.js";
import type { RainIsoAssetBundle } from "../../../app/infrastructure/rain_iso/assets/asset-types.js";

describe("anchor overrides ordinary", () => {
  it("同格存在锚点时普通站失效", () => {
    const assets = createAssets({
      gridCount: 2,
      stationIds: ["FIX-1", "ORD-1", "ORD-2"],
      stationToGrid: [0, 0, 1]
    });
    const anchorSets = createAnchorSets({
      fixed: [station("FIX-1", 10)],
      dynamic: [],
      ordinary: [station("ORD-1", 25), station("ORD-2", 6)]
    });

    const result = buildSeedGrid(anchorSets, { assets });

    expect(result.valueGrid[0]).toBe(10);
    expect(result.hardAnchorMask[0]).toBe(1);
    expect(result.softObsMask[0]).toBe(0);
    expect(result.valueGrid[1]).toBe(6);
    expect(result.softObsMask[1]).toBe(1);
  });
});

function createAssets(input: {
  gridCount: number;
  stationIds: string[];
  stationToGrid: number[];
}): Pick<RainIsoAssetBundle, "manifest" | "gridMeta" | "stationMeta" | "stationToGrid"> {
  return {
    manifest: {
      grid_count: input.gridCount
    } as RainIsoAssetBundle["manifest"],
    gridMeta: {
      gridId: new Int32Array(Array.from({ length: input.gridCount }, (_, index) => index)),
      row: new Int32Array(Array.from({ length: input.gridCount }, () => 0)),
      col: new Int32Array(Array.from({ length: input.gridCount }, (_, index) => index)),
      centerX: new Float32Array(
        Array.from({ length: input.gridCount }, (_, index) => index * 1000)
      ),
      centerY: new Float32Array(Array.from({ length: input.gridCount }, () => 0))
    },
    stationMeta: {
      station_count: input.stationIds.length,
      stations: input.stationIds.map((stationId, index) => ({
        station_id: stationId,
        station_name: stationId,
        lon: 116 + index * 0.01,
        lat: 40,
        is_fortress_anchor: false,
        is_tongzhou_anchor: false,
        is_cross_boundary_anchor: false
      }))
    },
    stationToGrid: new Int32Array(input.stationToGrid)
  };
}

function createAnchorSets(input: {
  fixed: AnchorSets["fixedAnchorStations"];
  dynamic: AnchorSets["dynamicAnchorStations"];
  ordinary: AnchorSets["ordinaryStations"];
}): AnchorSets {
  return {
    hardAnchorStations: [...input.fixed, ...input.dynamic],
    fixedAnchorStations: input.fixed,
    dynamicAnchorStations: input.dynamic,
    ordinaryStations: input.ordinary,
    excludedStations: []
  };
}

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
