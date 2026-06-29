import { describe, expect, it } from "vitest";

import { buildSeedGrid } from "../../../app/application/rain_iso/grids/build-seed-grid.js";
import type { AnchorSets } from "../../../app/application/rain_iso/anchors/build-anchor-sets.js";
import type { RainIsoAssetBundle } from "../../../app/infrastructure/rain_iso/assets/asset-types.js";

describe("buildSeedGrid", () => {
  it("同格多个锚点按固定高于动态、同级取最大值裁决", () => {
    const assets = createAssets({
      gridCount: 2,
      stationIds: ["FIX-1", "FIX-2", "DYN-1"],
      stationToGrid: [0, 0, 0]
    });
    const anchorSets = createAnchorSets({
      fixed: [
        station("FIX-1", 12),
        station("FIX-2", 15)
      ],
      dynamic: [station("DYN-1", 30)],
      ordinary: []
    });

    const result = buildSeedGrid(anchorSets, { assets });

    expect(Array.from(result.hardAnchorMask)).toEqual([1, 0]);
    expect(Array.from(result.softObsMask)).toEqual([0, 0]);
    expect(result.valueGrid[0]).toBe(15);
    expect(result.ordinaryOnlyMode).toBe(false);
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
