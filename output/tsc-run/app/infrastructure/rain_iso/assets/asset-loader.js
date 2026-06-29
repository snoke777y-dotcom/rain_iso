import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFixedAnchorDictionary } from "./fixed-anchor-dictionary.js";
import { decodeNamedTypedArrays } from "./typed-array-codec.js";
import { assertChecksum, validateAssetBundle } from "./asset-validator.js";
export async function loadRainIsoAssets(options) {
    const manifestPath = join(options.assetDirectory, "asset_manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const [gridMetaBytes, gridMaskBytes, gridNeighborsBytes, stationToGridBytes, stationMetaBytes, renderBoundaryBytes] = await Promise.all([
        readAssetBinary(options.assetDirectory, manifest.files.grid_meta),
        readAssetBinary(options.assetDirectory, manifest.files.grid_mask),
        readAssetBinary(options.assetDirectory, manifest.files.grid_neighbors),
        readAssetBinary(options.assetDirectory, manifest.files.station_to_grid),
        readAssetBinary(options.assetDirectory, manifest.files.station_meta),
        readAssetBinary(options.assetDirectory, manifest.files.render_boundary)
    ]);
    assertChecksum(manifest.files.grid_meta, gridMetaBytes, manifest.checksums.grid_meta);
    assertChecksum(manifest.files.grid_mask, gridMaskBytes, manifest.checksums.grid_mask);
    assertChecksum(manifest.files.grid_neighbors, gridNeighborsBytes, manifest.checksums.grid_neighbors);
    assertChecksum(manifest.files.station_to_grid, stationToGridBytes, manifest.checksums.station_to_grid);
    assertChecksum(manifest.files.station_meta, stationMetaBytes, manifest.checksums.station_meta);
    assertChecksum(manifest.files.render_boundary, renderBoundaryBytes, manifest.checksums.render_boundary);
    const decodedGridMeta = decodeNamedTypedArrays(gridMetaBytes);
    const decodedGridNeighbors = decodeNamedTypedArrays(gridNeighborsBytes);
    const decodedStationToGrid = decodeNamedTypedArrays(stationToGridBytes);
    const stationMeta = JSON.parse(new TextDecoder().decode(stationMetaBytes));
    const renderBoundary = JSON.parse(new TextDecoder().decode(renderBoundaryBytes));
    const fixedAnchorDictionary = await loadFixedAnchorDictionary(options.fixedAnchorDictionaryPath ?? getDefaultFixedAnchorDictionaryPath());
    const stationIdsInAssets = new Set(stationMeta.stations.map((station) => String(station.station_id)));
    const fallbackNeighborStationIdsByStationId = await loadFallbackNeighborStationIdsByStationId(options.stationNeighborRelationsPath ?? getDefaultStationNeighborRelationsPath(), stationIdsInAssets);
    const bundle = {
        manifest,
        gridMeta: {
            gridId: decodedGridMeta.grid_id,
            row: decodedGridMeta.row,
            col: decodedGridMeta.col,
            centerX: decodedGridMeta.center_x,
            centerY: decodedGridMeta.center_y
        },
        gridMask: new Uint8Array(gridMaskBytes.buffer.slice(0)),
        gridNeighbors: decodedGridNeighbors.neighbors,
        stationToGrid: decodedStationToGrid.grid_id,
        stationMeta,
        renderBoundary,
        fixedAnchorStationIds: new Set(fixedAnchorDictionary.stations
            .map((station) => station.station_id)
            .filter((stationId) => stationIdsInAssets.has(stationId))),
        fallbackNeighborStationIdsByStationId
    };
    validateAssetBundle(bundle, {
        expectedAssetVersion: options.expectedAssetVersion
    });
    return bundle;
}
async function readAssetBinary(assetDirectory, fileName) {
    return new Uint8Array(await readFile(join(assetDirectory, fileName)));
}
function getDefaultFixedAnchorDictionaryPath() {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    return resolve(currentDir, "../../../../datas/03_dictionary/rain_iso/fixed_anchor_stations.json");
}
function getDefaultStationNeighborRelationsPath() {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    return resolve(currentDir, "../../../../datas/03_dictionary/rain_iso/station_neighbor_relations_5km.json");
}
async function loadFallbackNeighborStationIdsByStationId(filePath, stationIdsInAssets) {
    const payload = JSON.parse(await readFile(filePath, "utf8"));
    const result = new Map();
    for (const relation of payload.relations) {
        if (!stationIdsInAssets.has(relation.station_id)) {
            continue;
        }
        const fallbackNeighborStationIds = relation.fallback_nearest_neighbors
            .map((neighbor) => neighbor.station_id)
            .filter((stationId) => stationIdsInAssets.has(stationId));
        result.set(relation.station_id, fallbackNeighborStationIds);
    }
    return result;
}
