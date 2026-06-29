import { buildAnchorSets } from "../anchors/build-anchor-sets.js";
import { buildSeedGrid } from "../grids/build-seed-grid.js";
import { buildRainMask } from "../mask/build-rain-mask.js";
import { buildEffectiveStations } from "../preprocess/build-effective-stations.js";
import { applyRenderThreshold } from "../results/apply-render-threshold.js";
import { buildFrameResult } from "../results/build-frame-result.js";
import { buildFrameObservations } from "./run-frame-common.js";
import { constrainedSmooth } from "../../../infrastructure/rain_iso/cpu/constrained-smooth.js";
import { continuousPropagate } from "../../../infrastructure/rain_iso/cpu/continuous-propagate.js";
import { continuousPropagateOnWebGpu } from "../../../infrastructure/rain_iso/gpu/webgpu/continuous-propagate.js";
import { constrainedSmoothOnWebGpu } from "../../../infrastructure/rain_iso/gpu/webgpu/constrained-smooth.js";
import { continuousPropagateOnWebGl2 } from "../../../infrastructure/rain_iso/gpu/webgl2/continuous-propagate.js";
import { constrainedSmoothOnWebGl2 } from "../../../infrastructure/rain_iso/gpu/webgl2/constrained-smooth.js";
export function runFrameOnCpu(frame, options) {
    const observations = buildFrameObservations(frame, options.assets);
    const { effectiveStations } = buildEffectiveStations(observations, {
        frameType: frame.frameType,
        fallbackNeighborStationIdsByStationId: options.assets.fallbackNeighborStationIdsByStationId,
        validStationIds: new Set(options.assets.stationMeta.stations.map((station) => String(station.station_id)))
    });
    const anchorSets = buildAnchorSets(effectiveStations, {
        frameType: frame.frameType,
        fixedAnchorStationIds: options.assets.fixedAnchorStationIds
    });
    const seedGrid = buildSeedGrid(anchorSets, {
        assets: options.assets
    });
    const maskResult = buildRainMask({
        frameType: frame.frameType,
        gridMask: options.assets.gridMask,
        gridNeighbors: options.assets.gridNeighbors,
        gridCenterX: options.assets.gridMeta.centerX,
        gridCenterY: options.assets.gridMeta.centerY,
        hardAnchorMask: seedGrid.hardAnchorMask,
        softObsMask: seedGrid.softObsMask,
        radiusConfig: options.rainMaskRadiusConfig
    });
    const propagate = resolvePropagate(options.selectedBackend);
    const smooth = resolveSmooth(options.selectedBackend);
    const propagated = propagate({
        valueGrid: seedGrid.valueGrid,
        rainMask: maskResult.rainMask,
        knownMask: maskResult.knownMask,
        hardAnchorMask: seedGrid.hardAnchorMask,
        gridNeighbors: options.assets.gridNeighbors,
        gridCenterX: options.assets.gridMeta.centerX,
        gridCenterY: options.assets.gridMeta.centerY,
        ordinaryOnlyMode: seedGrid.ordinaryOnlyMode
    });
    const smoothedValueGrid = smooth({
        valueGrid: propagated.valueGrid,
        rainMask: maskResult.rainMask,
        hardAnchorMask: seedGrid.hardAnchorMask,
        softObsMask: seedGrid.softObsMask,
        gridNeighbors: options.assets.gridNeighbors,
        rounds: options.smoothConfig?.rounds,
        softObsMaxDelta: options.smoothConfig?.softObsMaxDelta
    });
    const thresholded = applyRenderThreshold({
        valueGrid: smoothedValueGrid,
        rainMask: maskResult.rainMask
    });
    const suspectStationCount = effectiveStations.filter((station) => station.status === "suspect").length;
    return buildFrameResult({
        frameKey: frame.frameKey,
        frameType: frame.frameType,
        frameTime: frame.frameTime,
        selectedBackend: options.selectedBackend,
        valueGrid: thresholded.valueGrid,
        rainMask: thresholded.rainMask,
        hardAnchorMask: seedGrid.hardAnchorMask,
        softObsMask: seedGrid.softObsMask,
        knownMask: propagated.knownMask,
        suspectStationCount,
        ordinaryOnlyMode: seedGrid.ordinaryOnlyMode
    });
}
function resolvePropagate(selectedBackend) {
    if (selectedBackend === "webgpu") {
        return continuousPropagateOnWebGpu;
    }
    if (selectedBackend === "webgl2") {
        return continuousPropagateOnWebGl2;
    }
    return continuousPropagate;
}
function resolveSmooth(selectedBackend) {
    if (selectedBackend === "webgpu") {
        return constrainedSmoothOnWebGpu;
    }
    if (selectedBackend === "webgl2") {
        return constrainedSmoothOnWebGl2;
    }
    return constrainedSmooth;
}
