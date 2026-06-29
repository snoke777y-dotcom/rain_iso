import { describe, expect, it, vi } from "vitest";

import { ensureAssetBundle } from "../../../browser/ensure-asset-bundle.js";
import type { RainIsoAssetBundle } from "../../../app/infrastructure/rain_iso/assets/asset-types.js";

describe("ensureAssetBundle", () => {
  it("已有资产时直接复用，不触发内置加载", async () => {
    const assetBundle = createAssetBundle("manual-assets");
    const loadDefaultAssetBundle = vi.fn<() => Promise<RainIsoAssetBundle>>();

    await expect(
      ensureAssetBundle({
        assetBundle,
        loadDefaultAssetBundle
      })
    ).resolves.toBe(assetBundle);
    expect(loadDefaultAssetBundle).not.toHaveBeenCalled();
  });

  it("缺少资产时回退到内置加载", async () => {
    const assetBundle = createAssetBundle("builtin-assets");
    const loadDefaultAssetBundle = vi.fn(async () => assetBundle);

    await expect(
      ensureAssetBundle({
        assetBundle: null,
        loadDefaultAssetBundle
      })
    ).resolves.toBe(assetBundle);
    expect(loadDefaultAssetBundle).toHaveBeenCalledTimes(1);
  });
});

function createAssetBundle(assetVersion: string): RainIsoAssetBundle {
  return {
    manifest: {
      protocol_version: "1",
      asset_version: assetVersion,
      algorithm_profile_version: "1",
      grid_resolution_m: 1000,
      grid_rows: 1,
      grid_cols: 1,
      grid_count: 1,
      grid_crs: "EPSG:3857",
      render_crs: "EPSG:4326",
      files: {
        grid_meta: "grid_meta.bin",
        grid_mask: "grid_mask.bin",
        grid_neighbors: "grid_neighbors.bin",
        station_to_grid: "station_to_grid.bin",
        station_meta: "station_meta.json",
        render_boundary: "render_boundary.geojson"
      },
      checksums: {
        grid_meta: "sha256:test",
        grid_mask: "sha256:test",
        grid_neighbors: "sha256:test",
        station_to_grid: "sha256:test",
        station_meta: "sha256:test",
        render_boundary: "sha256:test"
      }
    },
    gridMeta: {
      grid_id: new Int32Array([0]),
      row: new Int32Array([0]),
      col: new Int32Array([0]),
      center_x: new Float32Array([0]),
      center_y: new Float32Array([0])
    },
    gridMask: new Uint8Array([1]),
    gridNeighbors: new Int32Array([-1, -1, -1, -1, -1, -1, -1, -1]),
    stationToGrid: new Int32Array([0]),
    stationMeta: {
      station_count: 1,
      stations: [
        {
          station_id: "A",
          station_name: "A",
          lon: 116,
          lat: 40,
          is_fortress_anchor: false,
          is_tongzhou_anchor: false,
          is_cross_boundary_anchor: false
        }
      ]
    },
    fallbackNeighborStationIdsByStationId: new Map(),
    renderBoundary: {
      type: "FeatureCollection",
      features: []
    },
    fixedAnchorStationIds: new Set()
  };
}
