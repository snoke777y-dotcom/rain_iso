import type { FrameType } from "../../../domain/rain_iso/models.js";
import { buildKnownGrid } from "../grids/build-known-grid.js";
import { estimateExpansionRadius } from "./estimate-expansion-radius.js";

export type RainMaskBuildResult = {
  knownMask: Uint8Array;
  rainMask: Uint8Array;
  expansionRadius: number;
};

export function buildRainMask(options: {
  frameType: FrameType;
  gridMask: Uint8Array;
  gridNeighbors: Int32Array;
  gridCenterX: Float32Array;
  gridCenterY: Float32Array;
  hardAnchorMask: Uint8Array;
  softObsMask: Uint8Array;
  radiusConfig?: {
    minRadius?: number;
    maxRadius?: number;
    hardAnchorBonus?: number;
    expansionOffset?: number;
  };
}): RainMaskBuildResult {
  const knownMask = buildKnownGrid({
    hardAnchorMask: options.hardAnchorMask,
    softObsMask: options.softObsMask
  });
  const hardAnchorGridIds = collectMarkedGridIds(options.hardAnchorMask);
  const softObsGridIds = collectMarkedGridIds(options.softObsMask);
  const knownGridCount = collectMarkedGridIds(knownMask).length;
  const estimatedExpansionRadius = estimateExpansionRadius({
    frameType: options.frameType,
    knownGridCount,
    hardAnchorGridIds,
    gridCenterX: options.gridCenterX,
    gridCenterY: options.gridCenterY,
    minRadius: options.radiusConfig?.minRadius,
    maxRadius: options.radiusConfig?.maxRadius
  });
  const expansionRadius =
    estimatedExpansionRadius === 0
      ? 0
      : Math.max(
          0,
          estimatedExpansionRadius + (options.radiusConfig?.expansionOffset ?? 0)
        );
  const rainMask = new Uint8Array(options.gridMask.length);

  if (expansionRadius === 0) {
    return {
      knownMask,
      rainMask,
      expansionRadius
    };
  }

  const hardAnchorBonus = options.radiusConfig?.hardAnchorBonus ?? 1;
  const bestRemainingSteps = new Int32Array(options.gridMask.length).fill(-1);
  const queueGridIds: number[] = [];
  const queueRemainingSteps: number[] = [];
  let queueHead = 0;

  for (const gridId of hardAnchorGridIds) {
    queueGridIds.push(gridId);
    queueRemainingSteps.push(expansionRadius + hardAnchorBonus);
  }
  for (const gridId of softObsGridIds) {
    queueGridIds.push(gridId);
    queueRemainingSteps.push(expansionRadius);
  }

  while (queueHead < queueGridIds.length) {
    const gridId = queueGridIds[queueHead];
    const remainingSteps = queueRemainingSteps[queueHead];
    queueHead += 1;

    if (gridId < 0 || options.gridMask[gridId] !== 1) {
      continue;
    }
    if (remainingSteps <= bestRemainingSteps[gridId]) {
      continue;
    }

    bestRemainingSteps[gridId] = remainingSteps;
    rainMask[gridId] = 1;

    if (remainingSteps === 0) {
      continue;
    }

    const baseOffset = gridId * 8;
    for (let neighborIndex = 0; neighborIndex < 8; neighborIndex += 1) {
      const neighborGridId = options.gridNeighbors[baseOffset + neighborIndex];
      if (neighborGridId < 0) {
        continue;
      }

      queueGridIds.push(neighborGridId);
      queueRemainingSteps.push(remainingSteps - 1);
    }
  }

  return {
    knownMask,
    rainMask,
    expansionRadius
  };
}

function collectMarkedGridIds(mask: Uint8Array): number[] {
  const gridIds: number[] = [];
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 1) {
      gridIds.push(index);
    }
  }
  return gridIds;
}
