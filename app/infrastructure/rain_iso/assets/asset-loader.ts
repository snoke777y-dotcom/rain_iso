import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  AssetManifest,
  RainIsoAssetBundle,
  StationNeighborRelationsFile
} from "./asset-types.js";
import { buildRainIsoAssetBundle } from "./build-asset-bundle.js";
import { assertNodeChecksum } from "./checksum-node.js";
import { loadFixedAnchorDictionary } from "./fixed-anchor-dictionary.js";
import {
  validateAssetBundle
} from "./asset-validator.js";

export async function loadRainIsoAssets(options: {
  assetDirectory: string;
  expectedAssetVersion?: string;
  fixedAnchorDictionaryPath?: string;
  stationNeighborRelationsPath?: string;
}): Promise<RainIsoAssetBundle> {
  const manifestPath = join(options.assetDirectory, "asset_manifest.json");
  const manifest = JSON.parse(
    await readFile(manifestPath, "utf8")
  ) as AssetManifest;

  const [
    gridMetaBytes,
    gridMaskBytes,
    gridNeighborsBytes,
    stationToGridBytes,
    stationMetaBytes,
    renderBoundaryBytes
  ] = await Promise.all([
    readAssetBinary(options.assetDirectory, manifest.files.grid_meta),
    readAssetBinary(options.assetDirectory, manifest.files.grid_mask),
    readAssetBinary(options.assetDirectory, manifest.files.grid_neighbors),
    readAssetBinary(options.assetDirectory, manifest.files.station_to_grid),
    readAssetBinary(options.assetDirectory, manifest.files.station_meta),
    readAssetBinary(options.assetDirectory, manifest.files.render_boundary)
  ]);

  assertNodeChecksum(manifest.files.grid_meta, gridMetaBytes, manifest.checksums.grid_meta);
  assertNodeChecksum(manifest.files.grid_mask, gridMaskBytes, manifest.checksums.grid_mask);
  assertNodeChecksum(
    manifest.files.grid_neighbors,
    gridNeighborsBytes,
    manifest.checksums.grid_neighbors
  );
  assertNodeChecksum(
    manifest.files.station_to_grid,
    stationToGridBytes,
    manifest.checksums.station_to_grid
  );
  assertNodeChecksum(
    manifest.files.station_meta,
    stationMetaBytes,
    manifest.checksums.station_meta
  );
  assertNodeChecksum(
    manifest.files.render_boundary,
    renderBoundaryBytes,
    manifest.checksums.render_boundary
  );

  const fixedAnchorDictionary = await loadFixedAnchorDictionary(
    options.fixedAnchorDictionaryPath ?? getDefaultFixedAnchorDictionaryPath()
  );
  const stationNeighborRelations = await loadStationNeighborRelations(
    options.stationNeighborRelationsPath ?? getDefaultStationNeighborRelationsPath()
  );

  return buildRainIsoAssetBundle({
    manifest,
    gridMetaBytes,
    gridMaskBytes,
    gridNeighborsBytes,
    stationToGridBytes,
    stationMetaBytes,
    renderBoundaryBytes,
    fixedAnchorDictionary,
    stationNeighborRelations,
    expectedAssetVersion: options.expectedAssetVersion
  });
}

async function readAssetBinary(
  assetDirectory: string,
  fileName: string
): Promise<Uint8Array> {
  return new Uint8Array(await readFile(join(assetDirectory, fileName)));
}

function getDefaultFixedAnchorDictionaryPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(
    currentDir,
    "../../../../datas/03_dictionary/rain_iso/fixed_anchor_stations.json"
  );
}

function getDefaultStationNeighborRelationsPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(
    currentDir,
    "../../../../datas/03_dictionary/rain_iso/station_neighbor_relations_5km.json"
  );
}

async function loadStationNeighborRelations(
  filePath: string
): Promise<StationNeighborRelationsFile> {
  return JSON.parse(
    await readFile(filePath, "utf8")
  ) as StationNeighborRelationsFile;
}
