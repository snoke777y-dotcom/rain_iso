import { createHash } from "node:crypto";

import { zipSync } from "fflate";

import {
  RAIN_ISO_ALGORITHM_PROFILE_VERSION,
  RAIN_ISO_PROTOCOL_VERSION
} from "../../app/domain/rain_iso/constants.js";
import { FrameType } from "../../app/domain/rain_iso/models.js";
import { encodeNamedTypedArrays } from "../../app/infrastructure/rain_iso/assets/typed-array-codec.js";
import type { RawRainApiResponse } from "../../app/infrastructure/rain_iso/package/raw-api-adapter.js";

export function createSampleBrowserAssetFiles() {
  const fileBytes = createSampleAssetEntries();
  const manifest = buildManifest(fileBytes);
  fileBytes.set(
    "bj_1000m_union_assets/asset_manifest.json",
    JSON.stringify(manifest, null, 2)
  );

  const files = Array.from(fileBytes.entries()).map(([relativePath, value]) =>
    createFile(relativePath, value)
  );

  return {
    files,
    manifest
  };
}

export function createSampleAssetZipFile() {
  const fileBytes = createSampleAssetEntries();
  const manifest = buildManifest(fileBytes);
  fileBytes.set(
    "bj_1000m_union_assets/asset_manifest.json",
    JSON.stringify(manifest, null, 2)
  );

  const archive = zipSync(
    Object.fromEntries(
      Array.from(fileBytes.entries()).map(([relativePath, value]) => [
        relativePath,
        toUint8Array(value)
      ])
    )
  );

  return new File([archive], "rain_iso_assets_bundle.zip", {
    type: "application/zip"
  });
}

function createSampleAssetEntries() {
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
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [116, 40],
              [116.01, 40],
              [116.01, 39.99],
              [116, 39.99],
              [116, 40]
            ]
          ]
        },
        properties: {}
      }
    ]
  };
  const fixedAnchorDictionary = {
    version: "test-v1",
    stations: [
      { station_id: "fortress-1" },
      { station_id: "cross-1" },
      { station_id: "missing-in-assets" }
    ]
  };
  const stationNeighborRelations = {
    fallback_neighbor_count: 4,
    station_count: 3,
    relations: [
      {
        station_id: "fortress-1",
        neighbor_count_within_5km: 1,
        fallback_nearest_neighbors: [
          { station_id: "ordinary-1", distance_m: 1000 },
          { station_id: "cross-1", distance_m: 2000 }
        ]
      }
    ]
  };

  return new Map<string, Uint8Array | string>([
    ["bj_1000m_union_assets/grid_meta.bin", gridMeta],
    ["bj_1000m_union_assets/grid_mask.bin", gridMask],
    ["bj_1000m_union_assets/grid_neighbors.bin", gridNeighbors],
    ["bj_1000m_union_assets/station_to_grid.bin", stationToGrid],
    [
      "bj_1000m_union_assets/station_meta.json",
      JSON.stringify(stationMeta, null, 2)
    ],
    [
      "bj_1000m_union_assets/render_boundary.geojson",
      JSON.stringify(renderBoundary, null, 2)
    ],
    [
      "fixed_anchor_stations.json",
      JSON.stringify(fixedAnchorDictionary, null, 2)
    ],
    [
      "station_neighbor_relations_5km.json",
      JSON.stringify(stationNeighborRelations, null, 2)
    ]
  ]);
}

function buildManifest(fileBytes: Map<string, Uint8Array | string>) {
  const manifest = {
    protocol_version: RAIN_ISO_PROTOCOL_VERSION,
    asset_version: "2026-06-bj-grid-v1",
    algorithm_profile_version: RAIN_ISO_ALGORITHM_PROFILE_VERSION,
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
      grid_meta: "",
      grid_mask: "",
      grid_neighbors: "",
      station_to_grid: "",
      station_meta: "",
      render_boundary: ""
    }
  };

  for (const [filePath, value] of fileBytes) {
    const bytes = toUint8Array(value);
    const checksumKey = resolveChecksumKey(filePath);
    if (checksumKey) {
      manifest.checksums[checksumKey] = checksum(bytes);
    }
  }

  return manifest;
}

function resolveChecksumKey(
  filePath: string
): keyof ReturnType<typeof buildManifest>["checksums"] | null {
  const fileName = filePath.split("/").at(-1);
  switch (fileName) {
    case "grid_meta.bin":
      return "grid_meta";
    case "grid_mask.bin":
      return "grid_mask";
    case "grid_neighbors.bin":
      return "grid_neighbors";
    case "station_to_grid.bin":
      return "station_to_grid";
    case "station_meta.json":
      return "station_meta";
    case "render_boundary.geojson":
      return "render_boundary";
    default:
      return null;
  }
}

export function createRawRainPackageFiles() {
  return {
    realtime5mFile: new File(
      [JSON.stringify(createRawRainApiResponse(FrameType.Rain5m), null, 2)],
      "realtime_5m_response.json",
      { type: "application/json" }
    ),
    realtime1hFile: new File(
      [JSON.stringify(createRawRainApiResponse(FrameType.Accum1hStep), null, 2)],
      "realtime_1h_response.json",
      { type: "application/json" }
    )
  };
}

export function createRawRainApiResponse(productType: typeof FrameType[keyof typeof FrameType]): RawRainApiResponse {
  if (productType === FrameType.Rain5m) {
    return {
      code: "0",
      msg: "ok",
      data: {
        "2026-06-24 13:55:00": [
          createRawRecord("fortress-1", "Fortress A", 2),
          createRawRecord("ordinary-1", "Ordinary A", 1),
          createRawRecord("cross-1", "Cross A", 0.5)
        ],
        "2026-06-24 14:00:00": [
          createRawRecord("fortress-1", "Fortress A", 4),
          createRawRecord("ordinary-1", "Ordinary A", 1.5),
          createRawRecord("cross-1", "Cross A", 1)
        ]
      }
    };
  }

  return {
    code: "0",
    msg: "ok",
    data: {
      "2026-06-24 13:00:00": [
        createRawRecord("fortress-1", "Fortress A", 12),
        createRawRecord("ordinary-1", "Ordinary A", 8),
        createRawRecord("cross-1", "Cross A", 6)
      ],
      "2026-06-24 14:00:00": [
        createRawRecord("fortress-1", "Fortress A", 18),
        createRawRecord("ordinary-1", "Ordinary A", 9),
        createRawRecord("cross-1", "Cross A", 7)
      ]
    }
  };
}

function createRawRecord(stcd: string, stationName: string, drp: number) {
  return {
    sysid: "1",
    stcd,
    stnm: stationName,
    rvnm: "",
    hnnm: "",
    lgtd: 116,
    lttd: 40,
    stlc: "",
    addvcd: "110000",
    addvnm: "北京",
    adnm: "",
    stlvl: "1",
    admauth: "",
    isOut: "",
    drp,
    bscd: "",
    bsnm: "",
    area: "110000",
    star: 0
  };
}

function createFile(relativePath: string, value: Uint8Array | string) {
  const file = new File([toBlobPart(value)], relativePath.split("/").at(-1) ?? relativePath, {
    type: typeof value === "string" ? "application/json" : "application/octet-stream"
  });
  Object.defineProperty(file, "webkitRelativePath", {
    configurable: true,
    enumerable: true,
    value: relativePath
  });
  return file;
}

function checksum(bytes: Uint8Array) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function toUint8Array(value: Uint8Array | string) {
  return typeof value === "string"
    ? new TextEncoder().encode(value)
    : value;
}

function toBlobPart(value: Uint8Array | string) {
  if (typeof value === "string") {
    return value;
  }

  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}
