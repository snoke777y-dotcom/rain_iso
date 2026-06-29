import type {
  AssetManifest,
  RainIsoAssetBundle,
  StationMetaFile,
  StationNeighborRelationsFile
} from "./asset-types.js";
import { decodeNamedTypedArrays } from "./typed-array-codec.js";
import { validateAssetBundle } from "./asset-validator.js";

export type FixedAnchorDictionary = {
  stations: Array<{
    station_id: string;
  }>;
};

export function buildRainIsoAssetBundle(options: {
  manifest: AssetManifest;
  gridMetaBytes: Uint8Array;
  gridMaskBytes: Uint8Array;
  gridNeighborsBytes: Uint8Array;
  stationToGridBytes: Uint8Array;
  stationMetaBytes: Uint8Array;
  renderBoundaryBytes: Uint8Array;
  fixedAnchorDictionary: FixedAnchorDictionary;
  stationNeighborRelations: StationNeighborRelationsFile;
  expectedAssetVersion?: string;
}): RainIsoAssetBundle {
  const decodedGridMeta = decodeNamedTypedArrays(options.gridMetaBytes);
  const decodedGridNeighbors = decodeNamedTypedArrays(options.gridNeighborsBytes);
  const decodedStationToGrid = decodeNamedTypedArrays(options.stationToGridBytes);
  const stationMeta = JSON.parse(
    new TextDecoder().decode(options.stationMetaBytes)
  ) as StationMetaFile;
  const renderBoundary = JSON.parse(
    new TextDecoder().decode(options.renderBoundaryBytes)
  ) as Record<string, unknown>;
  const stationIdsInAssets = new Set(
    stationMeta.stations.map((station) => String(station.station_id))
  );

  const bundle: RainIsoAssetBundle = {
    manifest: options.manifest,
    gridMeta: {
      gridId: decodedGridMeta.grid_id as Int32Array,
      row: decodedGridMeta.row as Int32Array,
      col: decodedGridMeta.col as Int32Array,
      centerX: decodedGridMeta.center_x as Float32Array,
      centerY: decodedGridMeta.center_y as Float32Array
    },
    gridMask: new Uint8Array(options.gridMaskBytes.buffer.slice(0)),
    gridNeighbors: decodedGridNeighbors.neighbors as Int32Array,
    stationToGrid: decodedStationToGrid.grid_id as Int32Array,
    stationMeta,
    renderBoundary,
    fixedAnchorStationIds: new Set(
      options.fixedAnchorDictionary.stations
        .map((station) => station.station_id)
        .filter((stationId) => stationIdsInAssets.has(stationId))
    ),
    fallbackNeighborStationIdsByStationId: buildFallbackNeighborStationIdsByStationId(
      options.stationNeighborRelations,
      stationIdsInAssets
    )
  };

  validateAssetBundle(bundle, {
    expectedAssetVersion: options.expectedAssetVersion
  });

  return bundle;
}

function buildFallbackNeighborStationIdsByStationId(
  payload: StationNeighborRelationsFile,
  stationIdsInAssets: Set<string>
) {
  const result = new Map<string, string[]>();

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
