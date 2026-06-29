import { unzipSync } from "fflate";

import type { RainIsoAssetBundle, StationNeighborRelationsFile } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import { buildRainIsoAssetBundle, type FixedAnchorDictionary } from "../../../infrastructure/rain_iso/assets/build-asset-bundle.js";
import { assertBrowserChecksum } from "../../../infrastructure/rain_iso/assets/checksum-browser.js";
import { AssetValidationError } from "../../../infrastructure/rain_iso/assets/asset-validator.js";
import { FrameType } from "../../../domain/rain_iso/models.js";
import {
  buildRainIsoSequenceFromApiResponse,
  type RainIsoDirectSequence,
  type RawRainApiResponse
} from "../../../infrastructure/rain_iso/package/raw-api-adapter.js";
import {
  PackageValidationError,
  validateLoadedRainIsoPackage,
  validateRawRainApiResponse
} from "../../../infrastructure/rain_iso/package/package-validator.js";
import type {
  BrowserAssetBundleSource,
  BrowserRainDataPackage,
  BrowserRainPackageSource
} from "./types.js";

export async function loadAssetBundleFromDirectory(
  source: BrowserAssetBundleSource
): Promise<RainIsoAssetBundle> {
  const filesByPath = await (
    "directoryHandle" in source
      ? await collectFilesFromDirectoryHandle(source.directoryHandle)
      : collectFilesFromList(source.files)
  );
  return buildAssetBundleFromFileMap(filesByPath);
}

export async function loadAssetBundleFromZip(file: Blob): Promise<RainIsoAssetBundle> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const filesByPath = new Map<string, Uint8Array>();

  for (const [filePath, bytes] of Object.entries(archive)) {
    if (filePath.endsWith("/")) {
      continue;
    }
    filesByPath.set(normalizePath(filePath), bytes);
  }

  return buildAssetBundleFromFileMap(filesByPath);
}

export async function loadRainPackageFromFiles(
  source: BrowserRainPackageSource
): Promise<BrowserRainDataPackage> {
  const rain5m = source.realtime5mFile
    ? buildSequence(await parseRawRainApiResponse(source.realtime5mFile), FrameType.Rain5m)
    : null;
  const accum1h = source.realtime1hFile
    ? buildSequence(await parseRawRainApiResponse(source.realtime1hFile), FrameType.Accum1hStep)
    : null;

  if (!rain5m && !accum1h) {
    throw new PackageValidationError("请至少导入一个 JSON 文件");
  }

  const stationIds = rain5m?.stationIds ?? accum1h?.stationIds ?? [];
  const resolvedRain5m = rain5m ?? createEmptySequence(FrameType.Rain5m, stationIds);
  const resolvedAccum1h = accum1h ?? createEmptySequence(FrameType.Accum1hStep, stationIds);

  const dataPackage = {
    stationIds,
    rain5m: resolvedRain5m,
    accum1h: resolvedAccum1h
  };

  validateLoadedRainIsoPackage(dataPackage);
  return dataPackage;
}

async function buildAssetBundleFromFileMap(
  filesByPath: Map<string, Uint8Array>
): Promise<RainIsoAssetBundle> {
  const manifestPath = findUniquePathByBaseName(filesByPath, "asset_manifest.json");
  const manifestBytes = requireBytes(filesByPath, manifestPath);
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as RainIsoAssetBundle["manifest"];
  const manifestDirectory = dirname(manifestPath);

  const gridMetaPath = joinPath(manifestDirectory, manifest.files.grid_meta);
  const gridMaskPath = joinPath(manifestDirectory, manifest.files.grid_mask);
  const gridNeighborsPath = joinPath(manifestDirectory, manifest.files.grid_neighbors);
  const stationToGridPath = joinPath(manifestDirectory, manifest.files.station_to_grid);
  const stationMetaPath = joinPath(manifestDirectory, manifest.files.station_meta);
  const renderBoundaryPath = joinPath(manifestDirectory, manifest.files.render_boundary);

  const gridMetaBytes = requireBytes(filesByPath, gridMetaPath);
  const gridMaskBytes = requireBytes(filesByPath, gridMaskPath);
  const gridNeighborsBytes = requireBytes(filesByPath, gridNeighborsPath);
  const stationToGridBytes = requireBytes(filesByPath, stationToGridPath);
  const stationMetaBytes = requireBytes(filesByPath, stationMetaPath);
  const renderBoundaryBytes = requireBytes(filesByPath, renderBoundaryPath);

  await assertBrowserChecksum(manifest.files.grid_meta, gridMetaBytes, manifest.checksums.grid_meta);
  await assertBrowserChecksum(manifest.files.grid_mask, gridMaskBytes, manifest.checksums.grid_mask);
  await assertBrowserChecksum(
    manifest.files.grid_neighbors,
    gridNeighborsBytes,
    manifest.checksums.grid_neighbors
  );
  await assertBrowserChecksum(
    manifest.files.station_to_grid,
    stationToGridBytes,
    manifest.checksums.station_to_grid
  );
  await assertBrowserChecksum(
    manifest.files.station_meta,
    stationMetaBytes,
    manifest.checksums.station_meta
  );
  await assertBrowserChecksum(
    manifest.files.render_boundary,
    renderBoundaryBytes,
    manifest.checksums.render_boundary
  );

  const fixedAnchorDictionaryPath = findUniquePathByBaseName(
    filesByPath,
    "fixed_anchor_stations.json"
  );
  const stationNeighborRelationsPath = findUniquePathByBaseName(
    filesByPath,
    "station_neighbor_relations_5km.json"
  );

  return buildRainIsoAssetBundle({
    manifest,
    gridMetaBytes,
    gridMaskBytes,
    gridNeighborsBytes,
    stationToGridBytes,
    stationMetaBytes,
    renderBoundaryBytes,
    fixedAnchorDictionary: JSON.parse(
      new TextDecoder().decode(requireBytes(filesByPath, fixedAnchorDictionaryPath))
    ) as FixedAnchorDictionary,
    stationNeighborRelations: JSON.parse(
      new TextDecoder().decode(requireBytes(filesByPath, stationNeighborRelationsPath))
    ) as StationNeighborRelationsFile
  });
}

async function collectFilesFromDirectoryHandle(handle: FileSystemDirectoryHandle) {
  const filesByPath = new Map<string, Uint8Array>();
  await visitDirectory(handle, "", filesByPath);
  return filesByPath;
}

async function visitDirectory(
  handle: FileSystemDirectoryHandle,
  prefix: string,
  filesByPath: Map<string, Uint8Array>
): Promise<void> {
  for await (const [name, entry] of handle.entries()) {
    const nextPath = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === "directory") {
      await visitDirectory(entry as FileSystemDirectoryHandle, nextPath, filesByPath);
      continue;
    }
    filesByPath.set(
      normalizePath(nextPath),
      new Uint8Array(
        await (await (entry as FileSystemFileHandle).getFile()).arrayBuffer()
      )
    );
  }
}

function collectFilesFromList(files: Iterable<File>) {
  const filesByPath = new Map<string, Uint8Array>();
  const pending: Array<Promise<void>> = [];

  for (const file of files) {
    const relativePath = readRelativePath(file);
    pending.push(
      file.arrayBuffer().then((buffer) => {
        filesByPath.set(normalizePath(relativePath), new Uint8Array(buffer));
      })
    );
  }

  return Promise.all(pending).then(() => filesByPath);
}

async function parseRawRainApiResponse(file: File): Promise<RawRainApiResponse> {
  try {
    return JSON.parse(await file.text()) as RawRainApiResponse;
  } catch (error) {
    throw new PackageValidationError(
      error instanceof Error ? error.message : "无法读取原始接口文件"
    );
  }
}

function buildSequence(
  rawResponse: RawRainApiResponse,
  productType: typeof FrameType[keyof typeof FrameType]
): RainIsoDirectSequence {
  validateRawRainApiResponse(rawResponse, {
    expectedProductType: productType
  });
  return buildRainIsoSequenceFromApiResponse(rawResponse, {
    productType
  });
}

function createEmptySequence(
  productType: typeof FrameType[keyof typeof FrameType],
  stationIds: string[]
): RainIsoDirectSequence {
  return {
    frameTimes: [],
    productType,
    stationIds,
    stationMetaById: {},
    values: new Float32Array(0)
  };
}

function requireBytes(filesByPath: Map<string, Uint8Array>, filePath: string) {
  const bytes = filesByPath.get(normalizePath(filePath));
  if (!bytes) {
    throw new AssetValidationError(`缺少文件: ${filePath}`);
  }
  return bytes;
}

function findUniquePathByBaseName(filesByPath: Map<string, Uint8Array>, baseName: string) {
  const matches = Array.from(filesByPath.keys()).filter(
    (filePath) => filePath.split("/").at(-1) === baseName
  );
  if (matches.length !== 1) {
    throw new AssetValidationError(`无法唯一定位文件: ${baseName}`);
  }
  return matches[0];
}

function readRelativePath(file: File) {
  const relativePath =
    (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
  return normalizePath(relativePath);
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function dirname(filePath: string) {
  const normalized = normalizePath(filePath);
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index) : "";
}

function joinPath(left: string, right: string) {
  return normalizePath([left, right].filter(Boolean).join("/"));
}
