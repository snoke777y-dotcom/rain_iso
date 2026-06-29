import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { RAIN_ISO_PROTOCOL_VERSION } from "../../../app/domain/rain_iso/constants.js";
import { loadRainIsoAssets } from "../../../app/infrastructure/rain_iso/assets/asset-loader.js";
import {
  AssetValidationError
} from "../../../app/infrastructure/rain_iso/assets/asset-validator.js";
import { encodeNamedTypedArrays } from "../../../app/infrastructure/rain_iso/assets/typed-array-codec.js";

describe("loadRainIsoAssets", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dirPath) => rm(dirPath, { recursive: true, force: true })));
  });

  it("能从样例静态资产中读取网格和固定锚点标签", async () => {
    const assetDir = await createSampleAssetBundle();
    const fixedAnchorDictionaryPath = await createFixedAnchorDictionary(assetDir);
    const stationNeighborRelationsPath = await createStationNeighborRelations(assetDir);
    tempDirs.push(assetDir);

    const assets = await loadRainIsoAssets({
      assetDirectory: assetDir,
      expectedAssetVersion: "2026-06-bj-grid-v1",
      fixedAnchorDictionaryPath,
      stationNeighborRelationsPath
    });

    expect(assets.manifest.asset_version).toBe("2026-06-bj-grid-v1");
    expect(Array.from(assets.gridMeta.gridId)).toEqual([0, 1]);
    expect(Array.from(assets.gridMask)).toEqual([1, 1]);
    expect(Array.from(assets.stationToGrid)).toEqual([0, 1, 1]);
    expect(assets.fixedAnchorStationIds).toEqual(
      new Set(["fortress-1", "cross-1"])
    );
    expect(assets.fallbackNeighborStationIdsByStationId.get("fortress-1")).toEqual([
      "ordinary-1",
      "cross-1"
    ]);
  });

  it("asset_version 不匹配时中止加载并报校验错误", async () => {
    const assetDir = await createSampleAssetBundle();
    const fixedAnchorDictionaryPath = await createFixedAnchorDictionary(assetDir);
    const stationNeighborRelationsPath = await createStationNeighborRelations(assetDir);
    tempDirs.push(assetDir);

    await expect(
      loadRainIsoAssets({
        assetDirectory: assetDir,
        expectedAssetVersion: "unexpected-version",
        fixedAnchorDictionaryPath,
        stationNeighborRelationsPath
      })
    ).rejects.toMatchObject({
      code: "ASSET_VALIDATION_FAILED"
    });
  });
});

async function createSampleAssetBundle(): Promise<string> {
  const assetDir = await mkdtemp(join(tmpdir(), "rain-iso-assets-"));

  const gridMeta = encodeNamedTypedArrays({
    grid_id: new Int32Array([0, 1]),
    row: new Int32Array([0, 0]),
    col: new Int32Array([0, 1]),
    center_x: new Float32Array([1000, 2000]),
    center_y: new Float32Array([3000, 3000])
  });
  const gridMask = new Uint8Array([1, 1]);
  const gridNeighbors = encodeNamedTypedArrays({
    neighbors: new Int32Array([
      -1, -1, 1, -1, -1, -1, -1, -1,
      -1, -1, -1, -1, -1, -1, 0, -1
    ])
  });
  const stationToGrid = encodeNamedTypedArrays({
    grid_id: new Int32Array([0, 1, 1])
  });
  const stationMeta = {
    station_count: 3,
    stations: [
      {
        station_id: "fortress-1",
        station_name: "Fortress A",
        lon: 116.1,
        lat: 39.9,
        x: 1000,
        y: 3000,
        is_fortress_anchor: false,
        is_tongzhou_anchor: false,
        is_cross_boundary_anchor: false
      },
      {
        station_id: "ordinary-1",
        station_name: "Ordinary A",
        lon: 116.2,
        lat: 39.91,
        x: 2000,
        y: 3000,
        is_fortress_anchor: false,
        is_tongzhou_anchor: false,
        is_cross_boundary_anchor: false
      },
      {
        station_id: "cross-1",
        station_name: "Cross A",
        lon: 116.3,
        lat: 39.92,
        x: 2000,
        y: 3000,
        is_fortress_anchor: false,
        is_tongzhou_anchor: false,
        is_cross_boundary_anchor: false
      }
    ]
  };
  const renderBoundary = {
    type: "FeatureCollection",
    features: []
  };

  await writeFile(join(assetDir, "grid_meta.bin"), Buffer.from(gridMeta));
  await writeFile(join(assetDir, "grid_mask.bin"), Buffer.from(gridMask));
  await writeFile(join(assetDir, "grid_neighbors.bin"), Buffer.from(gridNeighbors));
  await writeFile(join(assetDir, "station_to_grid.bin"), Buffer.from(stationToGrid));
  await writeFile(
    join(assetDir, "station_meta.json"),
    JSON.stringify(stationMeta, null, 2),
    "utf8"
  );
  await writeFile(
    join(assetDir, "render_boundary.geojson"),
    JSON.stringify(renderBoundary, null, 2),
    "utf8"
  );

  const manifest = {
    protocol_version: RAIN_ISO_PROTOCOL_VERSION,
    asset_version: "2026-06-bj-grid-v1",
    algorithm_profile_version: "rain-iso-profile-v1",
    city_code: "beijing",
    grid_resolution_m: 1000,
    grid_rows: 1,
    grid_cols: 2,
    grid_count: 2,
    valid_grid_count: 2,
    grid_crs: "EPSG:3857",
    render_crs: "EPSG:4326",
    bbox_projected: [0, 0, 2, 1],
    bbox_render: [0, 0, 2, 1],
    files: {
      grid_meta: "grid_meta.bin",
      grid_mask: "grid_mask.bin",
      grid_neighbors: "grid_neighbors.bin",
      station_to_grid: "station_to_grid.bin",
      station_meta: "station_meta.json",
      render_boundary: "render_boundary.geojson"
    },
    checksums: {
      grid_meta: await checksum(join(assetDir, "grid_meta.bin")),
      grid_mask: await checksum(join(assetDir, "grid_mask.bin")),
      grid_neighbors: await checksum(join(assetDir, "grid_neighbors.bin")),
      station_to_grid: await checksum(join(assetDir, "station_to_grid.bin")),
      station_meta: await checksum(join(assetDir, "station_meta.json")),
      render_boundary: await checksum(join(assetDir, "render_boundary.geojson"))
    }
  };

  await writeFile(
    join(assetDir, "asset_manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  return assetDir;
}

async function createFixedAnchorDictionary(assetDir: string): Promise<string> {
  const filePath = join(assetDir, "fixed_anchor_stations.json");
  await writeFile(
    filePath,
    JSON.stringify(
      {
        version: "test-v1",
        generated_at: "2026-06-24",
        source_file: "test.xlsx",
        station_count: 3,
        stations: [
          {
            sequence: 1,
            station_id: "fortress-1",
            system_id: "1",
            station_name: "Fortress A",
            longitude: 116.1,
            latitude: 39.9,
            anchor_type: "fixed"
          },
          {
            sequence: 2,
            station_id: "cross-1",
            system_id: "2",
            station_name: "Cross A",
            longitude: 116.3,
            latitude: 39.92,
            anchor_type: "fixed"
          },
          {
            sequence: 3,
            station_id: "missing-in-assets",
            system_id: "3",
            station_name: "Missing",
            longitude: 0,
            latitude: 0,
            anchor_type: "fixed"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );
  return filePath;
}

async function createStationNeighborRelations(assetDir: string): Promise<string> {
  const filePath = join(assetDir, "station_neighbor_relations_5km.json");
  await writeFile(
    filePath,
    JSON.stringify(
      {
        source_file: "test.xls",
        radius_m: 5000,
        fallback_neighbor_count: 4,
        station_count: 3,
        relations: [
          {
            station_id: "fortress-1",
            neighbors_within_5km: [],
            neighbor_count_within_5km: 0,
            fallback_nearest_neighbors: [
              { station_id: "ordinary-1", distance_m: 6000.5 },
              { station_id: "cross-1", distance_m: 8000.25 },
              { station_id: "missing-in-assets", distance_m: 9000.75 }
            ]
          },
          {
            station_id: "ordinary-1",
            neighbors_within_5km: [],
            neighbor_count_within_5km: 0,
            fallback_nearest_neighbors: []
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );
  return filePath;
}

async function checksum(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
