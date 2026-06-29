import {
  AnchorKind,
  resolveAnchorConflict
} from "../../../domain/rain_iso/anchor-rules.js";
import type { AnchorSets } from "../anchors/build-anchor-sets.js";
import { mapStationsToGrid, type MappedStation } from "./map-stations-to-grid.js";
import { selectOrdinaryStationInCell } from "./select-ordinary-station-in-cell.js";
import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";

type MappedAnchorStation = MappedStation & {
  kind: AnchorKind;
};

export type SeedGridResult = {
  valueGrid: Float32Array;
  hardAnchorMask: Uint8Array;
  softObsMask: Uint8Array;
  ordinaryOnlyMode: boolean;
};

export function buildSeedGrid(
  anchorSets: AnchorSets,
  options: {
    assets: Pick<
      RainIsoAssetBundle,
      "manifest" | "gridMeta" | "stationMeta" | "stationToGrid"
    >;
  }
): SeedGridResult {
  const gridCount = options.assets.manifest.grid_count;
  const valueGrid = new Float32Array(gridCount);
  const hardAnchorMask = new Uint8Array(gridCount);
  const softObsMask = new Uint8Array(gridCount);

  const fixedAnchorStations = mapStationsToGrid(anchorSets.fixedAnchorStations, options.assets).map(
    (station) => ({
      ...station,
      kind: AnchorKind.CoreGuard
    })
  );
  const dynamicAnchorStations = mapStationsToGrid(
    anchorSets.dynamicAnchorStations,
    options.assets
  ).map((station) => ({
    ...station,
    kind: AnchorKind.DynamicTop30
  }));
  const ordinaryStations = mapStationsToGrid(anchorSets.ordinaryStations, options.assets);

  const hardAnchorByGrid = new Map<number, MappedAnchorStation>();
  for (const station of [...fixedAnchorStations, ...dynamicAnchorStations]) {
    const current = hardAnchorByGrid.get(station.gridId);
    if (!current) {
      hardAnchorByGrid.set(station.gridId, station);
      continue;
    }

    const winner = resolveAnchorConflict(
      {
        kind: current.kind,
        stationId: current.stationId,
        value: current.value
      },
      {
        kind: station.kind,
        stationId: station.stationId,
        value: station.value
      }
    );

    hardAnchorByGrid.set(
      station.gridId,
      winner.stationId === current.stationId ? current : station
    );
  }

  for (const [gridId, station] of hardAnchorByGrid) {
    valueGrid[gridId] = station.value;
    hardAnchorMask[gridId] = 1;
  }

  const ordinaryOnlyMode = hardAnchorByGrid.size === 0;
  const ordinaryByGrid = new Map<number, MappedStation[]>();
  for (const station of ordinaryStations) {
    const cellStations = ordinaryByGrid.get(station.gridId);
    if (cellStations) {
      cellStations.push(station);
    } else {
      ordinaryByGrid.set(station.gridId, [station]);
    }
  }

  for (const [gridId, cellStations] of ordinaryByGrid) {
    if (hardAnchorByGrid.has(gridId)) {
      continue;
    }

    const chosen = selectOrdinaryStationInCell(cellStations, {
      referenceValue: ordinaryOnlyMode
        ? null
        : resolveNearestHardAnchorValue(gridId, hardAnchorByGrid, valueGrid, options.assets)
    });
    valueGrid[gridId] = chosen.value;
    softObsMask[gridId] = 1;
  }

  return {
    valueGrid,
    hardAnchorMask,
    softObsMask,
    ordinaryOnlyMode
  };
}

function resolveNearestHardAnchorValue(
  gridId: number,
  hardAnchorByGrid: Map<number, MappedAnchorStation>,
  valueGrid: Float32Array,
  assets: Pick<RainIsoAssetBundle, "gridMeta">
): number | null {
  let bestGridId: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const anchorGridId of hardAnchorByGrid.keys()) {
    const dx = assets.gridMeta.centerX[anchorGridId] - assets.gridMeta.centerX[gridId];
    const dy = assets.gridMeta.centerY[anchorGridId] - assets.gridMeta.centerY[gridId];
    const distanceSquared = dx * dx + dy * dy;

    if (
      distanceSquared < bestDistance ||
      (distanceSquared === bestDistance &&
        bestGridId !== null &&
        valueGrid[anchorGridId] > valueGrid[bestGridId])
    ) {
      bestGridId = anchorGridId;
      bestDistance = distanceSquared;
    }
  }

  return bestGridId === null ? null : valueGrid[bestGridId];
}
