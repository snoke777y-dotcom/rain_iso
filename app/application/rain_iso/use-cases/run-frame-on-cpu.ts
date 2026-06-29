import type { BackendKind } from "../../../domain/rain_iso/models.js";
import type { RainIsoAssetBundle } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import { buildAnchorSets } from "../anchors/build-anchor-sets.js";
import { buildSeedGrid } from "../grids/build-seed-grid.js";
import { buildRainMask } from "../mask/build-rain-mask.js";
import { buildEffectiveStations } from "../preprocess/build-effective-stations.js";
import { applyRenderThreshold } from "../results/apply-render-threshold.js";
import { buildFrameResult } from "../results/build-frame-result.js";
import type { DirectFrame } from "../series/build-5m-frames.js";
import { buildFrameObservations } from "./run-frame-common.js";
import { constrainedSmooth } from "../../../infrastructure/rain_iso/cpu/constrained-smooth.js";
import { continuousPropagate } from "../../../infrastructure/rain_iso/cpu/continuous-propagate.js";
import { continuousPropagateOnWebGpu } from "../../../infrastructure/rain_iso/gpu/webgpu/continuous-propagate.js";
import { constrainedSmoothOnWebGpu } from "../../../infrastructure/rain_iso/gpu/webgpu/constrained-smooth.js";
import { continuousPropagateOnWebGl2 } from "../../../infrastructure/rain_iso/gpu/webgl2/continuous-propagate.js";
import { constrainedSmoothOnWebGl2 } from "../../../infrastructure/rain_iso/gpu/webgl2/constrained-smooth.js";
import { getOrCreateWebGl2Runtime } from "../../../infrastructure/rain_iso/gpu/webgl2/runtime.js";

export async function runFrameOnCpu(
  frame: DirectFrame,
  options: {
    assets: Pick<
      RainIsoAssetBundle,
      | "manifest"
      | "gridMeta"
      | "gridMask"
      | "gridNeighbors"
      | "stationMeta"
      | "stationToGrid"
      | "fixedAnchorStationIds"
      | "fallbackNeighborStationIdsByStationId"
    >;
    selectedBackend: Exclude<BackendKind, "auto">;
    rainMaskRadiusConfig?: {
      minRadius?: number;
      maxRadius?: number;
      hardAnchorBonus?: number;
      expansionOffset?: number;
    };
    assetCaches?: {
      stationMetaById?: ReadonlyMap<
        string,
        {
          station_id: string | number;
          lon: number;
          lat: number;
        }
      >;
      validStationIds?: Set<string>;
      gridIdByStationId?: ReadonlyMap<string, number>;
    };
    smoothConfig?: {
      rounds?: number;
      softObsMaxDelta?: number;
    };
  }
) {
  const observations = buildFrameObservations(frame, {
    ...options.assets,
    stationMetaById: options.assetCaches?.stationMetaById
  });
  const validStationIds =
    options.assetCaches?.validStationIds ??
    new Set(options.assets.stationMeta.stations.map((station) => String(station.station_id)));
  const { effectiveStations } = buildEffectiveStations(observations, {
    frameType: frame.frameType,
    fallbackNeighborStationIdsByStationId:
      options.assets.fallbackNeighborStationIdsByStationId,
    validStationIds
  });
  const anchorSets = buildAnchorSets(effectiveStations, {
    frameType: frame.frameType,
    fixedAnchorStationIds: options.assets.fixedAnchorStationIds
  });
  const seedGrid = buildSeedGrid(anchorSets, {
    assets: options.assets,
    gridIdByStationId: options.assetCaches?.gridIdByStationId
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
  const { propagated, smoothedValueGrid, actualBackend } =
    await runFieldStages({
      selectedBackend: options.selectedBackend,
      valueGrid: seedGrid.valueGrid,
      rainMask: maskResult.rainMask,
      knownMask: maskResult.knownMask,
      hardAnchorMask: seedGrid.hardAnchorMask,
      softObsMask: seedGrid.softObsMask,
      gridNeighbors: options.assets.gridNeighbors,
      gridCenterX: options.assets.gridMeta.centerX,
      gridCenterY: options.assets.gridMeta.centerY,
      ordinaryOnlyMode: seedGrid.ordinaryOnlyMode,
      smoothRounds: options.smoothConfig?.rounds,
      softObsMaxDelta: options.smoothConfig?.softObsMaxDelta
    });
  let resolvedBackend = actualBackend;
  let thresholded = applyRenderThreshold({
    valueGrid: smoothedValueGrid,
    rainMask: maskResult.rainMask
  });

  if (
    actualBackend !== "cpu" &&
    shouldFallbackToCpu({
      sourceValueGrid: seedGrid.valueGrid,
      sourceRainMask: maskResult.rainMask,
      resultValueGrid: thresholded.valueGrid,
      resultRainMask: thresholded.rainMask
    })
  ) {
    const cpuStages = await runFieldStagesOnCpu({
      valueGrid: seedGrid.valueGrid,
      rainMask: maskResult.rainMask,
      knownMask: maskResult.knownMask,
      hardAnchorMask: seedGrid.hardAnchorMask,
      softObsMask: seedGrid.softObsMask,
      gridNeighbors: options.assets.gridNeighbors,
      gridCenterX: options.assets.gridMeta.centerX,
      gridCenterY: options.assets.gridMeta.centerY,
      ordinaryOnlyMode: seedGrid.ordinaryOnlyMode,
      smoothRounds: options.smoothConfig?.rounds,
      softObsMaxDelta: options.smoothConfig?.softObsMaxDelta
    });
    thresholded = applyRenderThreshold({
      valueGrid: cpuStages.smoothedValueGrid,
      rainMask: maskResult.rainMask
    });
    resolvedBackend = "cpu";
  }
  const suspectStationCount = effectiveStations.filter(
    (station) => station.status === "suspect"
  ).length;

  return buildFrameResult({
    frameKey: frame.frameKey,
    frameType: frame.frameType,
    frameTime: frame.frameTime,
    selectedBackend: resolvedBackend,
    valueGrid: thresholded.valueGrid,
    rainMask: thresholded.rainMask,
    hardAnchorMask: seedGrid.hardAnchorMask,
    softObsMask: seedGrid.softObsMask,
    knownMask: propagated.knownMask,
    suspectStationCount,
    ordinaryOnlyMode: seedGrid.ordinaryOnlyMode
  });
}

function shouldFallbackToCpu(options: {
  sourceValueGrid: Float32Array;
  sourceRainMask: Uint8Array;
  resultValueGrid: Float32Array;
  resultRainMask: Uint8Array;
}) {
  return (
    hasRenderableSignal(options.sourceValueGrid, options.sourceRainMask) &&
    !hasRenderableSignal(options.resultValueGrid, options.resultRainMask)
  );
}

function hasRenderableSignal(valueGrid: Float32Array, rainMask: Uint8Array) {
  for (let gridId = 0; gridId < valueGrid.length; gridId += 1) {
    if (rainMask[gridId] !== 1) {
      continue;
    }

    const value = valueGrid[gridId];
    if (Number.isFinite(value) && value >= 0.1) {
      return true;
    }
  }
  return false;
}

async function runFieldStages(options: {
    selectedBackend: Exclude<BackendKind, "auto">;
    valueGrid: Float32Array;
    rainMask: Uint8Array;
    knownMask: Uint8Array;
    hardAnchorMask: Uint8Array;
    softObsMask: Uint8Array;
    gridNeighbors: Int32Array;
    gridCenterX: Float32Array;
    gridCenterY: Float32Array;
    ordinaryOnlyMode: boolean;
    smoothRounds?: number;
    softObsMaxDelta?: number;
  }
) {
  if (options.selectedBackend === "webgpu") {
    const propagated = await continuousPropagateOnWebGpu({
      valueGrid: options.valueGrid,
      rainMask: options.rainMask,
      knownMask: options.knownMask,
      hardAnchorMask: options.hardAnchorMask,
      gridNeighbors: options.gridNeighbors,
      gridCenterX: options.gridCenterX,
      gridCenterY: options.gridCenterY,
      ordinaryOnlyMode: options.ordinaryOnlyMode
    });
    const smoothedValueGrid = await constrainedSmoothOnWebGpu({
      valueGrid: propagated.valueGrid,
      rainMask: options.rainMask,
      hardAnchorMask: options.hardAnchorMask,
      softObsMask: options.softObsMask,
      gridNeighbors: options.gridNeighbors,
      rounds: options.smoothRounds,
      softObsMaxDelta: options.softObsMaxDelta
    });
    return {
      propagated,
      smoothedValueGrid,
      actualBackend: "webgpu" as const
    };
  }

  if (options.selectedBackend === "webgl2") {
    try {
      if (!getOrCreateWebGl2Runtime(options.valueGrid.length)) {
        return runFieldStagesOnCpu(options);
      }

      const propagated = await continuousPropagateOnWebGl2({
        valueGrid: options.valueGrid,
        rainMask: options.rainMask,
        knownMask: options.knownMask,
        hardAnchorMask: options.hardAnchorMask,
        gridNeighbors: options.gridNeighbors,
        gridCenterX: options.gridCenterX,
        gridCenterY: options.gridCenterY,
        ordinaryOnlyMode: options.ordinaryOnlyMode
      });
      const smoothedValueGrid = await constrainedSmoothOnWebGl2({
        valueGrid: propagated.valueGrid,
        rainMask: options.rainMask,
        hardAnchorMask: options.hardAnchorMask,
        softObsMask: options.softObsMask,
        gridNeighbors: options.gridNeighbors,
        rounds: options.smoothRounds,
        softObsMaxDelta: options.softObsMaxDelta
      });
      return {
        propagated,
        smoothedValueGrid,
        actualBackend: "webgl2" as const
      };
    } catch {
      return runFieldStagesOnCpu(options);
    }
  }

  return runFieldStagesOnCpu(options);
}

async function runFieldStagesOnCpu(options: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  knownMask: Uint8Array;
  hardAnchorMask: Uint8Array;
  softObsMask: Uint8Array;
  gridNeighbors: Int32Array;
  gridCenterX: Float32Array;
  gridCenterY: Float32Array;
  ordinaryOnlyMode: boolean;
  smoothRounds?: number;
  softObsMaxDelta?: number;
}) {
  const propagated = continuousPropagate({
    valueGrid: options.valueGrid,
    rainMask: options.rainMask,
    knownMask: options.knownMask,
    hardAnchorMask: options.hardAnchorMask,
    gridNeighbors: options.gridNeighbors,
    gridCenterX: options.gridCenterX,
    gridCenterY: options.gridCenterY,
    ordinaryOnlyMode: options.ordinaryOnlyMode
  });
  const smoothedValueGrid = constrainedSmooth({
    valueGrid: propagated.valueGrid,
    rainMask: options.rainMask,
    hardAnchorMask: options.hardAnchorMask,
    softObsMask: options.softObsMask,
    gridNeighbors: options.gridNeighbors,
    rounds: options.smoothRounds,
    softObsMaxDelta: options.softObsMaxDelta
  });
  return {
    propagated,
    smoothedValueGrid,
    actualBackend: "cpu" as const
  };
}
