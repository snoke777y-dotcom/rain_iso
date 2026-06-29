import { buildKnownGrid } from "../grids/build-known-grid.js";
import { estimateExpansionRadius } from "./estimate-expansion-radius.js";
export function buildRainMask(options) {
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
    const expansionRadius = estimatedExpansionRadius === 0
        ? 0
        : Math.max(0, estimatedExpansionRadius + (options.radiusConfig?.expansionOffset ?? 0));
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
    const queue = [];
    for (const gridId of hardAnchorGridIds) {
        queue.push({
            gridId,
            remainingSteps: expansionRadius + hardAnchorBonus
        });
    }
    for (const gridId of softObsGridIds) {
        queue.push({
            gridId,
            remainingSteps: expansionRadius
        });
    }
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            continue;
        }
        if (current.gridId < 0 || options.gridMask[current.gridId] !== 1) {
            continue;
        }
        if (current.remainingSteps <= bestRemainingSteps[current.gridId]) {
            continue;
        }
        bestRemainingSteps[current.gridId] = current.remainingSteps;
        rainMask[current.gridId] = 1;
        if (current.remainingSteps === 0) {
            continue;
        }
        const baseOffset = current.gridId * 8;
        for (let neighborIndex = 0; neighborIndex < 8; neighborIndex += 1) {
            const neighborGridId = options.gridNeighbors[baseOffset + neighborIndex];
            if (neighborGridId < 0) {
                continue;
            }
            queue.push({
                gridId: neighborGridId,
                remainingSteps: current.remainingSteps - 1
            });
        }
    }
    return {
        knownMask,
        rainMask,
        expansionRadius
    };
}
function collectMarkedGridIds(mask) {
    const gridIds = [];
    for (let index = 0; index < mask.length; index += 1) {
        if (mask[index] === 1) {
            gridIds.push(index);
        }
    }
    return gridIds;
}
