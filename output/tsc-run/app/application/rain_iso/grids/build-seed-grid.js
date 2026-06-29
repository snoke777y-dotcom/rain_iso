import { AnchorKind, resolveAnchorConflict } from "../../../domain/rain_iso/anchor-rules.js";
import { mapStationsToGrid } from "./map-stations-to-grid.js";
import { selectOrdinaryStationInCell } from "./select-ordinary-station-in-cell.js";
export function buildSeedGrid(anchorSets, options) {
    const gridCount = options.assets.manifest.grid_count;
    const valueGrid = new Float32Array(gridCount);
    const hardAnchorMask = new Uint8Array(gridCount);
    const softObsMask = new Uint8Array(gridCount);
    const fixedAnchorStations = mapStationsToGrid(anchorSets.fixedAnchorStations, options.assets).map((station) => ({
        ...station,
        kind: AnchorKind.CoreGuard
    }));
    const dynamicAnchorStations = mapStationsToGrid(anchorSets.dynamicAnchorStations, options.assets).map((station) => ({
        ...station,
        kind: AnchorKind.DynamicTop30
    }));
    const ordinaryStations = mapStationsToGrid(anchorSets.ordinaryStations, options.assets);
    const hardAnchorByGrid = new Map();
    for (const station of [...fixedAnchorStations, ...dynamicAnchorStations]) {
        const current = hardAnchorByGrid.get(station.gridId);
        if (!current) {
            hardAnchorByGrid.set(station.gridId, station);
            continue;
        }
        const winner = resolveAnchorConflict({
            kind: current.kind,
            stationId: current.stationId,
            value: current.value
        }, {
            kind: station.kind,
            stationId: station.stationId,
            value: station.value
        });
        hardAnchorByGrid.set(station.gridId, winner.stationId === current.stationId ? current : station);
    }
    for (const [gridId, station] of hardAnchorByGrid) {
        valueGrid[gridId] = station.value;
        hardAnchorMask[gridId] = 1;
    }
    const ordinaryOnlyMode = hardAnchorByGrid.size === 0;
    const ordinaryByGrid = new Map();
    for (const station of ordinaryStations) {
        const cellStations = ordinaryByGrid.get(station.gridId);
        if (cellStations) {
            cellStations.push(station);
        }
        else {
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
function resolveNearestHardAnchorValue(gridId, hardAnchorByGrid, valueGrid, assets) {
    let bestGridId = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const anchorGridId of hardAnchorByGrid.keys()) {
        const dx = assets.gridMeta.centerX[anchorGridId] - assets.gridMeta.centerX[gridId];
        const dy = assets.gridMeta.centerY[anchorGridId] - assets.gridMeta.centerY[gridId];
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < bestDistance ||
            (distanceSquared === bestDistance &&
                bestGridId !== null &&
                valueGrid[anchorGridId] > valueGrid[bestGridId])) {
            bestGridId = anchorGridId;
            bestDistance = distanceSquared;
        }
    }
    return bestGridId === null ? null : valueGrid[bestGridId];
}
